import zhTW from './locales/zh-TW.json';

const locales = { 'zh-TW': zhTW };

export const lang = 'zh-TW';
const strings = locales[lang];

// t('result.aliases', { names: '…' }) → looks up a dotted key and fills {placeholders}.
export function t(key, vars = {}) {
  const value = key.split('.').reduce((node, part) => node?.[part], strings);
  if (typeof value !== 'string') {
    console.warn(`Missing string: ${key}`);
    return key;
  }
  return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
