import './styles.css';
import { t } from './i18n.js';
import { h } from './dom.js';
import { identify } from './api.js';
import { shrinkPhoto } from './image.js';
import { homeScreen } from './screens/home.js';
import { loadingScreen } from './screens/loading.js';
import { resultScreen } from './screens/result.js';
import { errorScreen } from './screens/error.js';
import { candidatesScreen } from './screens/candidates.js';
import { diaryScreen } from './screens/diary.js';
import { addEntry, getEntry, listEntries, countKinds } from './diary.js';
import { photoFile, canSharePhoto, sharePhoto } from './share.js';

const LOW_CONFIDENCE = 0.5;
const RECENT_COUNT = 3;

document.title = t('app.title');

const app = document.getElementById('app');

// Hidden file inputs. .click() must run inside the tap handler or iOS ignores it.
const albumInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
const cameraInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
document.body.append(albumInput, cameraInput);

for (const [input, source] of [
  [albumInput, 'album'],
  [cameraInput, 'camera'],
]) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = ''; // allow picking the same photo again
    if (file) startIdentify(file, source);
  });
}

const pickAlbum = () => albumInput.click();
const takePhoto = () => cameraInput.click();

// One photo and everything learned about it. results[i] is the result for
// candidates[i]; [0] comes with the first answer, others load on 「就是 X」.
let session = null;
let request = null; // AbortController for the request in flight
let nextSessionId = 1;

// Screens below Home are history entries, so the back button / swipe-back walks
// back through them: { screen, sid, depth, pick?, viaList?, overResult? }.
// depth counts entries above Home; sid ties an entry to its session.
// Diary screens don't belong to a session: { screen: 'diary' | 'entry', depth, id? }.

// Object URLs for diary photos on the current screen, freed when it goes away.
let viewUrls = [];
// Bumped on every show(), so a screen still loading from IndexedDB can tell
// she has already moved on.
let viewSeq = 0;

function show(screen, urls = []) {
  viewSeq++;
  for (const url of viewUrls) URL.revokeObjectURL(url);
  viewUrls = urls;
  app.replaceChildren(screen);
  window.scrollTo(0, 0);
}

// Loads diary entries for a screen; returns null if she left before they arrived.
async function loadForScreen(load) {
  const seq = viewSeq;
  let data;
  try {
    data = await load();
  } catch (err) {
    console.warn('diary read failed', err);
    data = undefined;
  }
  return seq === viewSeq ? { data } : null;
}

const withUrls = (entries) => entries.map((entry) => ({ entry, url: URL.createObjectURL(entry.photo) }));

function abortRequest() {
  request?.abort();
  request = null;
}

function reset() {
  abortRequest();
  if (session) URL.revokeObjectURL(session.photoUrl);
  session = null;
}

async function showHome() {
  reset();
  const loaded = await loadForScreen(listEntries);
  if (!loaded) return;
  const recent = withUrls((loaded.data || []).slice(0, RECENT_COUNT));
  show(
    homeScreen({
      onPickAlbum: pickAlbum,
      onTakePhoto: takePhoto,
      recent,
      onOpenDiary: () => go({ screen: 'diary', depth: 1 }),
      onOpenEntry: (id) => go({ screen: 'entry', id, depth: 1 }),
    }),
    recent.map((item) => item.url)
  );
}

function goHome() {
  const depth = history.state?.depth ?? 0;
  if (depth > 0) history.go(-depth);
  else showHome();
}

const goBack = () => history.back();

function navigate(state, replace = false) {
  const full = { ...state, sid: session.id };
  if (replace) history.replaceState(full, '');
  else history.pushState(full, '');
  render(full);
}

// Push a diary screen (not tied to a photo session).
function go(state) {
  history.pushState(state, '');
  render(state);
}

window.addEventListener('popstate', () => {
  abortRequest();
  render(history.state);
});

function render(state) {
  if (!state?.screen) return showHome();
  if (state.screen === 'diary') return showDiary(state);
  if (state.screen === 'entry') return showEntry(state);
  // An entry left over from an earlier photo, or a loading screen she already left.
  if (!session || state.sid !== session.id || state.screen === 'loading') return goHome();
  if (state.screen === 'candidates') return showCandidates(state);
  if (state.screen === 'result') return showResult(state);
  goHome();
}

function showCandidates(state) {
  show(
    candidatesScreen({
      candidates: session.candidates,
      photoUrl: session.photoUrl,
      onBack: goBack,
      onRetake: takePhoto,
      onPick: (pick) => {
        // Opened from the top result and she picked that same flower: just go back to it.
        if (state.overResult && pick === 0) return goBack();
        navigate({ screen: 'result', pick, viaList: true, depth: state.depth + 1 });
      },
    })
  );
}

function showResult(state) {
  const { pick } = state;
  const result = session.results[pick];
  if (!result) return loadPick(state);

  let onOthers = null;
  if (session.candidates.length > 1) {
    onOthers = state.viaList ? goBack : () => navigate({ screen: 'candidates', overResult: true, depth: state.depth + 1 });
  }
  const current = session;
  show(
    resultScreen({
      result,
      photoUrl: current.photoUrl,
      takenAt: current.takenAt,
      place: null,
      saved: current.saved[pick] != null,
      onSave: async () => {
        current.saved[pick] = await addEntry({
          photo: current.photo,
          result: { confidence: result.confidence, info: result.info, candidates: current.candidates },
          takenAt: current.takenAt,
          source: current.source,
        });
      },
      onShare: shareAction(current.source, current.photo),
      onBack: goBack,
      onAgain: pickAlbum,
      onOthers,
    })
  );
}

// 「存到相簿」 only for photos taken in the app: album photos are already in Photos.
function shareAction(source, photo) {
  if (source !== 'camera') return null;
  const file = photoFile(photo);
  return canSharePhoto(file) ? () => sharePhoto(file) : null;
}

async function showDiary(state) {
  const loaded = await loadForScreen(listEntries);
  if (!loaded) return;
  const entries = loaded.data || [];
  const items = withUrls(entries);
  show(
    diaryScreen({
      items,
      kinds: countKinds(entries),
      onBack: goBack,
      onOpen: (id) => go({ screen: 'entry', id, depth: state.depth + 1 }),
      onPickAlbum: pickAlbum,
    }),
    items.map((item) => item.url)
  );
}

// A flower from the diary, shown with the same result screen.
async function showEntry(state) {
  const loaded = await loadForScreen(() => getEntry(state.id));
  if (!loaded) return;
  const entry = loaded.data;
  if (!entry) return goHome();
  const photoUrl = URL.createObjectURL(entry.photo);
  show(
    resultScreen({
      result: entry.result,
      photoUrl,
      takenAt: new Date(entry.takenAt),
      place: entry.place?.name || null,
      saved: true,
      onShare: shareAction(entry.source, entry.photo),
      onBack: goBack,
      onAgain: pickAlbum,
      onOthers: null,
    }),
    [photoUrl]
  );
}

// She picked a candidate we have no info for yet: ask for that species.
async function loadPick(state) {
  const { pick } = state;
  const candidate = session.candidates[pick];
  const controller = new AbortController();
  request = controller;
  show(loadingScreen({ photoUrl: session.photoUrl, onCancel: goBack }));

  try {
    const { info } = await identify(session.photo, { signal: controller.signal, species: candidate.scientificName });
    session.results[pick] = { confidence: candidate.score, candidates: session.candidates, info };
    showResult(state);
  } catch (err) {
    if (err.name === 'AbortError') return;
    show(errorScreen({ code: err.code, photoUrl: session.photoUrl, onHome: goHome, onRetry: pickAlbum }));
  } finally {
    if (request === controller) request = null;
  }
}

async function startIdentify(file, source) {
  reset();
  const controller = new AbortController();
  request = controller;

  const photo = await shrinkPhoto(file);
  if (controller.signal.aborted) return;
  session = {
    id: nextSessionId++,
    photo,
    photoUrl: URL.createObjectURL(photo),
    takenAt: new Date(),
    source,
    candidates: [],
    results: [],
    saved: [], // saved[i]: diary entry id once results[i] is in the diary
  };

  // Reuse the current entry if we're already past Home; entries below it belong
  // to the old photo and send her Home if she goes back to them.
  const depth = history.state?.depth || 1;
  navigateLoading(depth);

  try {
    const result = await identify(photo, { signal: controller.signal });
    session.candidates = result.candidates || [];
    session.results[0] = result;
    // Not sure (top match under 50%): let her compare the top candidates first.
    if (result.confidence < LOW_CONFIDENCE && session.candidates.length > 0) {
      navigate({ screen: 'candidates', depth }, true);
    } else {
      navigate({ screen: 'result', pick: 0, depth }, true);
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    history.replaceState({ screen: 'error', sid: session.id, depth }, '');
    show(errorScreen({ code: err.code, photoUrl: session.photoUrl, onHome: goHome, onRetry: pickAlbum }));
  } finally {
    if (request === controller) request = null;
  }
}

function navigateLoading(depth) {
  const state = { screen: 'loading', sid: session.id, depth };
  if (history.state?.screen) history.replaceState(state, '');
  else history.pushState(state, '');
  show(loadingScreen({ photoUrl: session.photoUrl, onCancel: goHome }));
}

// Start where history says (e.g. the diary after a reload); session screens fall back to Home.
render(history.state);
