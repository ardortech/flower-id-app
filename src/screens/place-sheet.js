import { h, icon } from '../dom.js';
import { icons } from '../icons.js';
import { t } from '../i18n.js';

// Bottom sheet 「這張是在這裡拍的嗎？」 for album photos without GPS. It sits
// outside #app, so identification and the result can carry on behind it.
// onAnswer gets { kind: 'here' } | { kind: 'typed', name } | { kind: 'skip' }, once.
// Returns close(), which removes it without an answer (e.g. she picked another photo).
export function showPlaceSheet({ onAnswer }) {
  let done = false;
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'place-sheet-title' });
  document.body.append(sheet);
  requestAnimationFrame(() => sheet.classList.add('sheet-open'));

  // Leave room under the page so she can still scroll to the buttons behind the sheet.
  const makeRoom = () => document.body.style.setProperty('--sheet-room', `${sheet.offsetHeight}px`);
  const close = () => {
    if (!sheet.isConnected) return;
    document.body.style.removeProperty('--sheet-room');
    sheet.classList.remove('sheet-open');
    setTimeout(() => sheet.remove(), 250);
  };
  const answer = (value) => {
    if (done) return;
    done = true;
    close();
    onAnswer(value);
  };

  const askView = () =>
    sheet.replaceChildren(
      h('h2', { id: 'place-sheet-title', class: 'sheet-title' }, icon(icons.pin), t('place.askTitle')),
      h('p', { class: 'sheet-text' }, t('place.askText')),
      h('div', { class: 'sheet-actions' },
        h('button', { type: 'button', class: 'btn btn-primary', onClick: () => answer({ kind: 'here' }) }, t('place.here')),
        h('button', { type: 'button', class: 'btn btn-outline', onClick: typeView }, t('place.type')),
        h('button', { type: 'button', class: 'link-button sheet-skip', onClick: () => answer({ kind: 'skip' }) }, t('place.skip'))
      )
    );

  const typeView = () => {
    const input = h('input', {
      type: 'text', class: 'sheet-input', id: 'place-input', enterkeyhint: 'done', autocomplete: 'off',
      maxlength: '60', placeholder: t('place.typePlaceholder'),
    });
    const submit = (event) => {
      event.preventDefault();
      const name = input.value.trim();
      answer(name ? { kind: 'typed', name } : { kind: 'skip' });
    };
    sheet.replaceChildren(
      h('form', { class: 'sheet-form', onSubmit: submit },
        h('label', { id: 'place-sheet-title', class: 'sheet-title', for: 'place-input' }, icon(icons.pin), t('place.typeTitle')),
        input,
        h('div', { class: 'sheet-actions' },
          h('button', { type: 'submit', class: 'btn btn-primary' }, t('place.typeDone')),
          h('button', { type: 'button', class: 'link-button sheet-skip', onClick: () => answer({ kind: 'skip' }) }, t('place.skip'))
        )
      )
    );
    makeRoom();
    input.focus();
  };

  askView();
  makeRoom();
  return close;
}
