import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t } from '../i18n.js';
import { backBar } from './result.js';

// Pl@ntNet reference photo, or a plain flower tile if there is none or it fails to load.
function referencePhoto(candidate, name) {
  const placeholder = () => h('div', { class: 'candidate-photo candidate-photo-empty' }, icon(icons.flower, 'icon icon-lg'));
  const url = candidate.images?.[0];
  if (!url) return placeholder();
  const img = h('img', {
    src: url,
    alt: t('candidates.referenceAlt', { name }),
    loading: 'lazy',
    referrerpolicy: 'no-referrer',
  });
  const box = h('div', { class: 'candidate-photo' }, img);
  img.addEventListener('error', () => box.replaceWith(placeholder()), { once: true });
  return box;
}

function candidateItem(candidate, onPick) {
  const name = candidate.commonName || candidate.scientificName;
  const percent = Math.round((candidate.score || 0) * 100);
  return h(
    'li',
    { class: 'candidate' },
    h(
      'div',
      { class: 'card candidate-card' },
      referencePhoto(candidate, name),
      h(
        'div',
        { class: 'candidate-text' },
        h('h2', { class: 'candidate-name' }, name),
        candidate.commonName && h('p', { class: 'candidate-sci', lang: 'la' }, candidate.scientificName),
        h(
          'div',
          { class: 'score' },
          h('div', { class: 'score-bar', 'aria-hidden': 'true' }, h('span', { style: `width: ${Math.min(percent, 100)}%` })),
          h('span', { class: 'score-value', 'aria-label': t('candidates.score', { percent }) }, `${percent}%`)
        )
      )
    ),
    h(
      'button',
      { type: 'button', class: 'btn btn-green', onClick: onPick },
      candidate.commonName ? t('candidates.pick', { name: candidate.commonName }) : t('candidates.pickUnnamed')
    )
  );
}

export function candidatesScreen({ candidates, photoUrl, onBack, onPick, onRetake }) {
  return h(
    'section',
    { class: 'screen screen-candidates' },
    backBar(onBack),
    h(
      'div',
      { class: 'candidates-head' },
      h('div', { class: 'candidates-photo' }, h('img', { src: photoUrl, alt: t('candidates.photoAlt') })),
      h('div', {}, h('h1', {}, t('candidates.title')), h('p', {}, t('candidates.subtitle')))
    ),
    h(
      'ol',
      { class: 'candidate-list' },
      candidates.map((candidate, index) => candidateItem(candidate, () => onPick(index)))
    ),
    h(
      'div',
      { class: 'retake-tip' },
      h('h2', {}, t('candidates.noneTitle')),
      h('p', {}, t('candidates.noneTip')),
      h('button', { type: 'button', class: 'btn btn-outline', onClick: onRetake }, icon(icons.camera), t('candidates.retake'))
    ),
    h('footer', { class: 'result-footer' }, h('p', { class: 'small-print' }, t('candidates.attribution')))
  );
}
