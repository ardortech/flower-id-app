import './styles.css';
import { t } from './i18n.js';
import { h } from './dom.js';
import { identify } from './api.js';
import { shrinkPhoto } from './image.js';
import { homeScreen } from './screens/home.js';
import { loadingScreen } from './screens/loading.js';
import { resultScreen } from './screens/result.js';
import { errorScreen } from './screens/error.js';

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

let current = { controller: null, photoUrl: null };

function show(screen) {
  app.replaceChildren(screen);
  window.scrollTo(0, 0);
}

function reset() {
  current.controller?.abort();
  if (current.photoUrl) URL.revokeObjectURL(current.photoUrl);
  current = { controller: null, photoUrl: null };
}

function showHome() {
  reset();
  show(homeScreen({ onPickAlbum: pickAlbum, onTakePhoto: takePhoto }));
}

// Back button / swipe-back always leads home.
function goHome() {
  if (history.state?.screen) history.back();
  else showHome();
}
window.addEventListener('popstate', () => {
  if (!history.state?.screen) showHome();
});

async function startIdentify(file, source) {
  reset();
  const controller = new AbortController();
  current.controller = controller;

  const photo = await shrinkPhoto(file);
  if (controller.signal.aborted) return;
  const photoUrl = URL.createObjectURL(photo);
  current.photoUrl = photoUrl;
  const takenAt = new Date();

  if (history.state?.screen) history.replaceState({ screen: 'loading' }, '');
  else history.pushState({ screen: 'loading' }, '');
  show(loadingScreen({ photoUrl, onCancel: goHome }));

  try {
    const result = await identify(photo, { signal: controller.signal });
    history.replaceState({ screen: 'result' }, '');
    show(resultScreen({ result, photoUrl, takenAt, place: null, source, onHome: goHome, onAgain: pickAlbum }));
  } catch (err) {
    if (err.name === 'AbortError') return;
    history.replaceState({ screen: 'error' }, '');
    show(errorScreen({ code: err.code, photoUrl, onHome: goHome, onRetry: pickAlbum }));
  } finally {
    if (current.controller === controller) current.controller = null;
  }
}

showHome();
