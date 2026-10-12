import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t, lang } from '../i18n.js';

const INFO_FIELDS = ['howToRecognize', 'floweringSeason', 'origin', 'whereInTaiwan', 'careTips', 'flowerMeaning', 'family'];

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

  return h(
    'section',
    { class: 'screen screen-result' },
    backBar(onHome),
    h('div', { class: 'result-photo' }, h('img', { src: photoUrl, alt: t('result.photoAlt') })),
    h(
      'div',
      { class: 'card result-head' },
      confidenceBadge(confidence),
      h('h1', { class: 'flower-name' }, info.commonName),
      info.scientificName && h('p', { class: 'scientific-name', lang: 'la' }, info.scientificName),
      aliases.length > 0 &&
        h('p', { class: 'aliases' }, t('result.aliases', { names: aliases.join(t('result.aliasSeparator')) })),
      h(
        'ul',
        { class: 'meta' },
        place && h('li', {}, icon(icons.pin), place),
        h('li', {}, icon(icons.clock), t('result.identifiedAt', { date: formatDate(takenAt) }))
      )
    ),
    h(
      'div',
      { class: 'card info-card' },
      h('h2', {}, t('result.infoTitle')),
      h(
        'dl',
        {},
        INFO_FIELDS.filter((key) => info[key]).map((key) =>
          h('div', { class: 'info-row' }, h('dt', {}, t(`result.fields.${key}`)), h('dd', {}, info[key]))
        )
      )
    ),
    info.toxicity &&
      h(
        'div',
        { class: 'warning-box', role: 'note' },
        h('h2', {}, icon(icons.warning), t('result.toxicityTitle')),
        h('p', {}, info.toxicity)
      ),
    h(
      'div',
      { class: 'result-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onClick: onAgain }, icon(icons.photos), t('result.again'))
    ),
    h('p', { class: 'disclaimer' }, t('result.disclaimer')),
    h('footer', { class: 'attribution' }, t('result.attribution'))
  );
}
