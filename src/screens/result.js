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

export function resultScreen({ result, photoUrl, takenAt, place, onHome, onAgain }) {
  const { info = {}, confidence = 0 } = result;
  const aliases = (info.aliases || []).filter(Boolean);
  const tableFields = TABLE_FIELDS.filter((key) => info[key]);

  return h(
    'section',
    { class: 'screen screen-result' },
    backBar(onHome),
    h('div', { class: 'result-photo' }, h('img', { src: photoUrl, alt: t('result.photoAlt') })),
    h(
      'div',
      { class: 'result-head' },
      confidenceBadge(confidence),
      h('h1', { class: 'flower-name' }, info.commonName),
      info.scientificName && h('p', { class: 'scientific-name', lang: 'la' }, info.scientificName),
      aliases.length > 0 &&
        h('p', { class: 'aliases' }, t('result.aliases', { names: aliases.join(t('result.aliasSeparator')) })),
      h(
        'div',
        { class: `meta${place ? ' has-place' : ''}` },
        place && h('p', { class: 'meta-place' }, icon(icons.pin), place),
        h('p', { class: 'meta-date' }, t('result.identifiedAt', { date: formatDate(takenAt) }))
      )
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
      h('button', { type: 'button', class: 'btn btn-primary', onClick: onAgain }, t('result.again'))
    ),
    h(
      'footer',
      { class: 'result-footer' },
      h('p', { class: 'small-print' }, t('result.disclaimer')),
      h('p', { class: 'small-print' }, t('result.attribution'))
    )
  );
}
