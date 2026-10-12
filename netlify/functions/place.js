// GET /api/place?lat=…&lng=…&lang=zh-TW → { name } — a short place name such as
// 「台北市大安區・大安森林公園附近」, from OpenStreetMap Nominatim reverse geocoding.
// Runs on the server so every request carries our own User-Agent and Referer.
// Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
// at most 1 request/second, identify the app, cache results, no bulk lookups.
// The browser only asks for one photo at a time, and rounds coordinates so the
// CDN cache below answers repeat lookups without reaching Nominatim.

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const SITE = 'https://flower.klchang.com.tw';
const USER_AGENT = `FlowerID/0.1 (+${SITE})`;
const LANGS = new Set(['zh-TW', 'en']);
const MIN_INTERVAL_MS = 1100;
const MOCK_PLACE = '台北市大安區・大安森林公園附近';

const json = (body, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      // Netlify's CDN keeps place names for a month, so the same spot isn't looked up twice.
      ...(status === 200 && cache !== 'no-store' ? { 'Netlify-CDN-Cache-Control': 'public, max-age=2592000, durable' } : {}),
    },
  });

// One request per second from this function instance; results cached in memory too.
let lastCall = 0;
const memo = new Map();
const MEMO_MAX = 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function throttled(url) {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  lastCall = Math.max(Date.now(), lastCall + MIN_INTERVAL_MS);
  if (wait > 0) await sleep(wait);
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Referer: SITE, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
}

// 臺北市 → 台北市: the everyday spelling.
const everyday = (text) => (text || '').replace(/臺/g, '台').trim();

// Builds 「縣市區・地標附近」 from a Nominatim jsonv2 reverse result.
export function shortPlaceName(data) {
  const a = data?.address || {};
  // In Taiwan, 直轄市 come back as city (臺北市 + suburb 大安區); counties as
  // county (新竹縣 + city/town 竹北市, 竹東鎮…).
  const top = a.county || a.city || a.state || '';
  const local = a.county
    ? a.city || a.town || a.village || a.suburb || ''
    : a.suburb || a.city_district || a.district || a.town || a.village || '';
  const area = everyday(top + (local && local !== top ? local : ''));
  const landmark = everyday(data?.name || a.road || '');
  if (area && landmark) return `${area}・${landmark}附近`;
  return area || (landmark ? `${landmark}附近` : '');
}

export default async (req) => {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const lang = LANGS.has(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'zh-TW';
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  if (!url.searchParams.get('lat') || !url.searchParams.get('lng') ||
      !(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) {
    return json({ error: 'bad_coordinates' }, 400);
  }

  if (process.env.MOCK_IDENTIFY) {
    console.log('[place] MOCK_IDENTIFY set: returning a canned place, no Nominatim call');
    return json({ name: MOCK_PLACE });
  }

  // Coordinates are logged rounded to ~1 km only.
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${lang}`;
  const where = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (memo.has(key)) {
    console.log(`[place] ${where}: cached`);
    return json({ name: memo.get(key) }, 200, 'public, max-age=86400');
  }

  const query = new URLSearchParams({
    format: 'jsonv2', lat: String(lat), lon: String(lng), zoom: '18', addressdetails: '1', 'accept-language': lang,
  });
  try {
    const res = await throttled(`${NOMINATIM}?${query}`);
    if (!res.ok) {
      console.error(`[place] ${where}: Nominatim HTTP ${res.status}`);
      return json({ error: 'lookup_failed' }, 502);
    }
    const data = await res.json();
    const name = data?.error ? '' : shortPlaceName(data);
    console.log(`[place] ${where}: ${name ? 'found' : 'no name'}`);
    if (!name) return json({ error: 'no_place' }, 404);
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
    memo.set(key, name);
    return json({ name }, 200, 'public, max-age=86400');
  } catch (err) {
    console.error(`[place] ${where}: lookup failed:`, err?.message || err);
    return json({ error: 'lookup_failed' }, 502);
  }
};

export const config = { path: '/api/place' };
