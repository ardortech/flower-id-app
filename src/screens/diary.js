import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t, lang } from '../i18n.js';
import { backBar } from './result.js';

const dayFormat = new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric' });

export const entryName = (entry) => entry.result?.info?.commonName || entry.result?.info?.scientificName || '';

// One saved flower as a tappable tile. `details` adds place and date (diary grid);
// the Home strip shows just the photo and name.
export function diaryTile({ entry, url, onOpen, details = false }) {
  const name = entryName(entry);
  return h(
    'li',
    { class: 'tile' },
    h(
      'button',
      { type: 'button', class: 'tile-button', onClick: onOpen },
      h('div', { class: 'tile-photo' }, h('img', { src: url, alt: '', loading: 'lazy' })),
      h('span', { class: 'tile-name' }, name),
      details &&
        h(
          'span',
          { class: `tile-place${entry.place?.name ? '' : ' tile-place-none'}` },
          icon(icons.pin),
          entry.place?.name || t('diary.noPlace')
        ),
      details && h('span', { class: 'tile-date' }, dayFormat.format(entry.takenAt))
    )
  );
}

// items: [{ entry, url }], newest first.
export function diaryScreen({ items, kinds, onBack, onOpen, onPickAlbum }) {
  return h(
    'section',
    { class: 'screen screen-diary' },
    backBar(onBack),
    h(
      'header',
      { class: 'diary-head' },
      h('h1', {}, t('diary.title')),
      items.length > 0 && h('p', {}, t('diary.count', { count: kinds }))
    ),
    items.length > 0
      ? h(
          'ul',
          { class: 'tile-grid' },
          items.map((item) => diaryTile({ ...item, details: true, onOpen: () => onOpen(item.entry.id) }))
        )
      : h(
          'div',
          { class: 'diary-empty' },
          h('div', { class: 'recent-empty' }, icon(icons.flower, 'icon icon-lg'), h('p', {}, t('diary.empty'))),
          h('button', { type: 'button', class: 'btn btn-primary', onClick: onPickAlbum }, icon(icons.photos), t('home.pickFromAlbum'))
        )
  );
}
