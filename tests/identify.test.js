import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import handler, { config } from '../netlify/functions/identify.js';

before(() => {
  process.env.MOCK_DELAY_MS = '0';
});

function request(fields, method = 'POST') {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return new Request('http://localhost/api/identify', { method, body: method === 'POST' ? body : undefined });
}

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'flower.jpg', { type: 'image/jpeg' });

test('is served at /api/identify', () => {
  assert.equal(config.path, '/api/identify');
});

test('MOCK_IDENTIFY=1 returns the canned result', async () => {
  process.env.MOCK_IDENTIFY = '1';
  const res = await handler(request({ image: jpeg(), lang: 'zh-TW' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.confidence, 'number');
  assert.equal(data.candidates.length, 3);
  for (const key of [
    'commonName', 'aliases', 'scientificName', 'family', 'floweringSeason', 'origin',
    'howToRecognize', 'flowerMeaning', 'careTips', 'toxicity', 'whereInTaiwan',
  ]) {
    assert.ok(key in data.info, `info.${key} missing`);
  }
});

test('MOCK_IDENTIFY=no_plant returns the no_plant error', async () => {
  process.env.MOCK_IDENTIFY = 'no_plant';
  const res = await handler(request({ image: jpeg() }));
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), { error: 'no_plant' });
});

test('MOCK_IDENTIFY=low returns a low-confidence result with named candidates', async () => {
  process.env.MOCK_IDENTIFY = 'low';
  const res = await handler(request({ image: jpeg(), lang: 'zh-TW' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.confidence < 0.5);
  assert.equal(data.candidates.length, 3);
  for (const c of data.candidates) {
    assert.equal(typeof c.scientificName, 'string');
    assert.equal(typeof c.commonName, 'string');
    assert.equal(typeof c.score, 'number');
    assert.ok(Array.isArray(c.images));
  }
});

test('species returns info for that candidate only', async () => {
  for (const mode of ['1', 'low']) {
    process.env.MOCK_IDENTIFY = mode;
    const { candidates } = await (await handler(request({ image: jpeg() }))).json();
    for (const c of candidates) {
      const res = await handler(request({ image: jpeg(), lang: 'zh-TW', species: c.scientificName }));
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(Object.keys(data), ['info']);
      assert.equal(data.info.scientificName, c.scientificName);
      assert.equal(data.info.commonName, c.commonName);
    }
  }
});

test('rejects an empty species', async () => {
  process.env.MOCK_IDENTIFY = '1';
  const res = await handler(request({ image: jpeg(), species: ' ' }));
  assert.equal(res.status, 400);
});

test('rejects missing image, wrong type and wrong method', async () => {
  process.env.MOCK_IDENTIFY = '1';
  assert.equal((await handler(request({ lang: 'zh-TW' }))).status, 400);
  const gif = new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' });
  assert.equal((await handler(request({ image: gif }))).status, 415);
  assert.equal((await handler(request({}, 'GET'))).status, 405);
});

test('without MOCK_IDENTIFY the real pipeline is not wired up yet', async () => {
  delete process.env.MOCK_IDENTIFY;
  const res = await handler(request({ image: jpeg() }));
  assert.equal(res.status, 501);
});
