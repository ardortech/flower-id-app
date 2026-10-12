import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t, lang } from '../i18n.js';

// Short facts go in the table card; longer text gets its own heading below.
const TABLE_FIELDS = ['family', 'floweringSeason', 'origin'];
const SECTIONS_BEFORE_WARNING = ['howToRecognize', 'flowerMeaning', 'careTips'];
const SECTIONS_AFTER_WARNING = ['whereInTaiwan'];

function confidenceBadge(confidence) {
  const level = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const label = t(`result.confidence${level[0].toUpperCase()}${level.slice(1)}`);
  return h(
    'span',
    { class: `badge badge-${level}` },
    t('result.confidenceValue', { label, percent: Math.round(confidence * 100) })
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

function sections(info, keys) {
  return keys
    .filter((key) => info[key])
    .map((key) => h('section', { class: 'info-section' }, h('h2', {}, t(`result.fields.${key}`)), h('p', {}, info[key])));
}

export function backBar(onBack) {
  return h(
    'div',
    { class: 'top-bar' },
    h('button', { type: 'button', class: 'btn-back', onClick: onBack }, icon(icons.back), t('result.back'))
  );
}

// 「加入我的花朵日記」. onSave() returns a promise; once it resolves the button
// turns into a quiet 「已加入」 so the same flower isn't saved twice.
function saveButton(saved, onSave) {
  const status = h('p', { class: 'save-status', role: 'status' });
  const button = h('button', { type: 'button', class: 'btn btn-primary' });
  const showSaved = () => {
    button.className = 'btn btn-saved';
    button.setAttribute('aria-disabled', 'true');
    button.replaceChildren(icon(icons.check), t('result.saved'));
  };
  if (saved) showSaved();
  else button.replaceChildren(t('result.save'));

  let busy = false;
  button.addEventListener('click', async () => {
    if (saved || busy) return;
    busy = true;
    status.textContent = '';
    try {
      await onSave();
      saved = true;
      showSaved();
    } catch (err) {
      console.warn('diary save failed', err);
      status.textContent = t('result.saveFailed');
    } finally {
      busy = false;
    }
  });
  return [button, status];
}

// onOthers is set when there are other candidates to compare (「不太像？看看其他可能」).
// onSave adds this flower to the diary (saved: already there). onShare is set only
// for photos taken in the app, which aren't in her album yet (「存到相簿」).
// place: { name, lat, lng } | null; placePending shows 「正在記錄地點…」 until
// screen.setPlace(place) is called.
export function resultScreen({ result, photoUrl, takenAt, place, placePending = false, saved, onSave, onShare, onBack, onAgain, onOthers }) {
  const { info = {}, confidence = 0 } = result;
  const placeLine = placeLineFor(place, placePending);
  const aliases = (info.aliases || []).filter(Boolean);
  const tableFields = TABLE_FIELDS.filter((key) => info[key]);

  const screen = h(
    'section',
    { class: 'screen screen-result' },
    backBar(onBack),
    h('div', { class: 'result-photo' }, h('img', { src: photoUrl, alt: t('result.photoAlt') })),
    h(
      'div',
      { class: 'result-head' },
      confidenceBadge(confidence),
      h('h1', { class: 'flower-name' }, info.commonName),
      info.scientificName && h('p', { class: 'scientific-name', lang: 'la' }, info.scientificName),
      aliases.length > 0 &&
        h('p', { class: 'aliases' }, t('result.aliases', { names: aliases.join(t('result.aliasSeparator')) })),
      h('div', { class: 'meta' }, placeLine.el, h('p', { class: 'meta-date' }, t('result.identifiedAt', { date: formatDate(takenAt) })))
    ),
    tableFields.length > 0 &&
      h(
        'dl',
        { class: 'card fact-table' },
        tableFields.map((key) => h('div', { class: 'fact-row' }, h('dt', {}, t(`result.fields.${key}`)), h('dd', {}, info[key])))
      ),
    sections(info, SECTIONS_BEFORE_WARNING),
    info.toxicity &&
      h(
        'div',
        { class: 'warning-box', role: 'note' },
        icon(icons.warning),
        h('div', {}, h('h2', {}, t('result.toxicityTitle')), h('p', {}, info.toxicity))
      ),
    sections(info, SECTIONS_AFTER_WARNING),
    h(
      'div',
      { class: 'result-actions' },
      saveButton(saved, onSave),
      onShare && h('button', { type: 'button', class: 'btn btn-outline', onClick: onShare }, icon(icons.download), t('result.saveToAlbum')),
      onAgain && h('button', { type: 'button', class: 'btn btn-green', onClick: onAgain }, t('result.again')),
      onOthers &&
        h('button', { type: 'button', class: 'link-button', onClick: onOthers }, t('result.others'), icon(icons.forward))
    ),
    h(
      'footer',
      { class: 'result-footer' },
      h('p', { class: 'small-print' }, t('result.disclaimer')),
      h('p', { class: 'small-print' }, t('result.attribution')),
      placeLine.attribution
    )
  );
  screen.setPlace = placeLine.set;
  return screen;
}

// 📍 line under the name. place: { name, lat, lng } | null; pending while we're
// still finding out. Coordinates mean the name came from OpenStreetMap, which
// asks for credit.
function placeLineFor(place, pending) {
  const text = h('span');
  const el = h('p', { class: 'meta-place' }, icon(icons.pin), text);
  const attribution = h('p', { class: 'small-print' }, t('result.placeAttribution'));
  const set = (value, stillPending = false) => {
    const known = Boolean(value?.name);
    text.textContent = known ? value.name : t(stillPending ? 'result.placeFinding' : 'result.noPlace');
    el.classList.toggle('meta-place-none', !known);
    attribution.hidden = !(known && value.lat != null);
  };
  set(place, pending);
  return { el, attribution, set };
}
