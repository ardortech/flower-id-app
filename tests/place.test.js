import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, { config, shortPlaceName } from '../netlify/functions/place.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MOCK_IDENTIFY;
});

const get = (query, method = 'GET') => handler(new Request(`http://localhost/api/place?${query}`, { method }));

test('is served at /api/place', () => {
  assert.equal(config.path, '/api/place');
});

test('short names: 直轄市 + 區 + landmark', () => {
  const name = shortPlaceName({
    name: '大安森林公園',
    address: { leisure: '大安森林公園', road: '新生南路二段', suburb: '大安區', city: '臺北市', country: '臺灣' },
  });
  assert.equal(name, '台北市大安區・大安森林公園附近');
});

test('short names: county + township, falls back to the road', () => {
  const name = shortPlaceName({ name: '', address: { road: '中正東路', town: '竹東鎮', county: '新竹縣' } });
  assert.equal(name, '新竹縣竹東鎮・中正東路附近');
});

test('short names: nothing useful gives an empty string', () => {
  assert.equal(shortPlaceName({ address: {} }), '');
  assert.equal(shortPlaceName(null), '');
});

test('rejects bad coordinates and other methods', async () => {
  assert.equal((await get('lat=abc&lng=121')).status, 400);
  assert.equal((await get('lat=95&lng=121')).status, 400);
  assert.equal((await get('lng=121')).status, 400);
  assert.equal((await get('lat=25&lng=121', 'POST')).status, 405);
});

test('MOCK_IDENTIFY returns a canned place without calling Nominatim', async () => {
  process.env.MOCK_IDENTIFY = '1';
  globalThis.fetch = () => assert.fail('should not call Nominatim');
  const res = await get('lat=25.03&lng=121.5357&lang=zh-TW');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, '台北市大安區・大安森林公園附近');
});

test('calls Nominatim with zh-TW, our User-Agent, and caches the answer', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return Response.json({ name: '', address: { road: '仁愛路四段', suburb: '大安區', city: '臺北市' } });
  };
  const res = await get('lat=25.0377&lng=121.5480&lang=zh-TW');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, '台北市大安區・仁愛路四段附近');
  assert.match(res.headers.get('cache-control'), /public/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, 'https://nominatim.openstreetmap.org/reverse');
  assert.equal(calls[0].url.searchParams.get('accept-language'), 'zh-TW');
  assert.match(calls[0].init.headers['User-Agent'], /https:\/\/flower\.klchang\.com\.tw/);

  const again = await get('lat=25.0377&lng=121.5480&lang=zh-TW');
  assert.equal((await again.json()).name, '台北市大安區・仁愛路四段附近');
  assert.equal(calls.length, 1, 'second lookup should come from the cache');
});

test('Nominatim failures become an error the browser treats as 略過', async () => {
  globalThis.fetch = async () => new Response('busy', { status: 503 });
  const res = await get('lat=24.1&lng=120.6');
  assert.equal(res.status, 502);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  globalThis.fetch = async () => Response.json({ error: 'Unable to geocode' });
  assert.equal((await get('lat=24.2&lng=120.6')).status, 404);
});
