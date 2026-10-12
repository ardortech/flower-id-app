import { h } from '../dom.js';
import { t } from '../i18n.js';

export function loadingScreen({ photoUrl, onCancel }) {
  return h(
    'section',
    { class: 'screen screen-loading', 'aria-busy': 'true' },
    h('div', { class: 'loading-photo' }, h('img', { src: photoUrl, alt: t('loading.photoAlt') })),
    h(
      'div',
      { class: 'loading-text', role: 'status' },
      h('div', { class: 'dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
      h('h1', {}, t('loading.title')),
      h('p', {}, t('loading.hint'))
    ),
    h('button', { type: 'button', class: 'btn btn-cancel', onClick: onCancel }, t('loading.cancel'))
  );
}
