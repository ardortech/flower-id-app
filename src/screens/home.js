import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t } from '../i18n.js';
import { diaryTile } from './diary.js';

// recent: the newest diary entries as [{ entry, url }] (at most 3).
export function homeScreen({ onPickAlbum, onTakePhoto, recent = [], onOpenEntry, onOpenDiary }) {
  return h(
    'section',
    { class: 'screen screen-home' },
    h(
      'header',
      { class: 'app-header' },
      h(
        'h1',
        { class: 'app-title' },
        icon(icons.logo, 'icon app-logo'),
        h('span', { class: 'app-name' }, t('app.name')),
        h('span', { class: 'app-name-sub', lang: 'en' }, t('app.nameSub'))
      ),
      h('p', { class: 'app-tagline' }, t('home.tagline'))
    ),
    h(
      'div',
      { class: 'home-actions' },
      h(
        'button',
        { type: 'button', class: 'btn btn-primary btn-big', onClick: onPickAlbum },
        icon(icons.photos),
        h(
          'span',
          { class: 'btn-text' },
          h('span', { class: 'btn-title' }, t('home.pickFromAlbum')),
          h('span', { class: 'btn-sub' }, t('home.pickFromAlbumSub'))
        )
      ),
      h(
        'button',
        { type: 'button', class: 'btn btn-outline btn-big btn-big-short', onClick: onTakePhoto },
        icon(icons.camera),
        h('span', { class: 'btn-text' }, h('span', { class: 'btn-title' }, t('home.takePhoto')))
      )
    ),
    h(
      'section',
      { class: 'recent', 'aria-labelledby': 'recent-title' },
      h(
        'div',
        { class: 'section-head' },
        h('h2', { id: 'recent-title' }, t('home.recentTitle')),
        recent.length > 0 &&
          h('button', { type: 'button', class: 'see-all', onClick: onOpenDiary }, t('home.seeAll'), icon(icons.forward))
      ),
      recent.length > 0
        ? h(
            'ul',
            { class: 'tile-strip' },
            recent.map((item) => diaryTile({ ...item, onOpen: () => onOpenEntry(item.entry.id) }))
          )
        : h('div', { class: 'recent-empty' }, icon(icons.flower, 'icon icon-lg'), h('p', {}, t('home.recentEmpty')))
    ),
    h(
      'footer',
      { class: 'home-footer' },
      h('p', { class: 'home-tip' }, t('home.tip')),
      h('p', { class: 'small-print' }, t('home.attribution'))
    )
  );
}
