import { lang } from './i18n.js';

export class IdentifyError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Returns { confidence, candidates, info }. Throws IdentifyError with a code
// ('no_plant', 'offline', or a server code) the UI turns into a friendly message.
export async function identify(photo, { signal } = {}) {
  const body = new FormData();
  body.append('image', photo);
  body.append('lang', lang);

  let res;
  try {
    res = await fetch('/api/identify', { method: 'POST', body, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new IdentifyError(navigator.onLine === false ? 'offline' : 'network');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) throw new IdentifyError(data?.error || `http_${res.status}`);
  return data;
}
