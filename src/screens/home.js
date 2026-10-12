import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t } from '../i18n.js';

export function appHeader() {
  return h(
    'header',
    { class: 'app-header' },
    h('img', { class: 'app-logo', src: '/icons/icon-192.png', alt: '', width: 40, height: 40 }),
    h('span', { class: 'app-name' }, t('app.name')),
    h('span', { class: 'app-name-sub', lang: 'en' }, t('app.nameSub'))
  );
}

export function homeScreen({ onPickAlbum, onTakePhoto }) {
  return h(
    'section',
    { class: 'screen screen-home' },
    appHeader(),
    h(
      'div',
      { class: 'home-hero' },
      h('h1', { class: 'home-greeting' }, t('home.greeting')),
      h('p', { class: 'home-intro' }, t('home.intro'))
    ),
    h(
      'div',
      { class: 'home-actions' },
      h(
        'button',
        { type: 'button', class: 'btn btn-primary btn-xl', onClick: onPickAlbum },
        icon(icons.photos),
        t('home.pickFromAlbum')
      ),
      h('p', { class: 'btn-hint' }, t('home.pickHint')),
      h(
        'button',
        { type: 'button', class: 'btn btn-outline', onClick: onTakePhoto },
        icon(icons.camera),
        t('home.takePhoto')
      )
    ),
    h(
      'section',
      { class: 'recent', 'aria-labelledby': 'recent-title' },
      h('div', { class: 'section-head' }, h('h2', { id: 'recent-title' }, t('home.recentTitle'))),
      // Diary (step 5) fills this strip; until then show the empty state.
      h('div', { class: 'recent-empty' }, icon(icons.flower, 'icon icon-lg'), h('p', {}, t('home.recentEmpty')))
    )
  );
}
