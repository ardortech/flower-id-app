import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t } from '../i18n.js';

const MESSAGES = {
  no_plant: { title: 'error.noPlantTitle', body: 'error.noPlant' },
  offline: { title: 'error.generalTitle', body: 'error.offline' },
};

export function errorScreen({ code, photoUrl, onHome, onRetry }) {
  const msg = MESSAGES[code] || { title: 'error.generalTitle', body: 'error.general' };
  return h(
    'section',
    { class: 'screen screen-error' },
    photoUrl && h('div', { class: 'result-photo result-photo-dim' }, h('img', { src: photoUrl, alt: '' })),
    h(
      'div',
      { class: 'card error-card', role: 'alert' },
      icon(icons.flower, 'icon icon-lg'),
      h('h1', {}, t(msg.title)),
      h('p', {}, t(msg.body))
    ),
    h(
      'div',
      { class: 'result-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onClick: onRetry }, icon(icons.photos), t('error.tryAgain')),
      h('button', { type: 'button', class: 'btn btn-outline', onClick: onHome }, t('error.home'))
    )
  );
}
