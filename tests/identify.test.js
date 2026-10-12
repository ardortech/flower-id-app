import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import handler, { config } from '../netlify/functions/identify.js';
import { mockInfo } from '../netlify/lib/mock-result.js';

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

// ---------- real pipeline, with fetch stubbed (no network) ----------

const PLANTNET_KEY = 'pn-secret-key-123';
const ANTHROPIC_KEY = 'sk-ant-secret-key-456';

const plantnetOk = {
  results: [
    { score: 0.82, species: { scientificNameWithoutAuthor: 'Gardenia jasminoides', scientificName: 'Gardenia jasminoides J.Ellis' },
      images: [{ url: { o: 'https://bs.plantnet.org/o/1.jpg', m: 'https://bs.plantnet.org/m/1.jpg', s: 'https://bs.plantnet.org/s/1.jpg' } }] },
    { score: 0.09, species: { scientificNameWithoutAuthor: 'Tabernaemontana divaricata' }, images: [] },
    { score: 0.03, species: { scientificNameWithoutAuthor: 'Jasminum sambac' }, images: [] },
  ],
  remainingIdentificationRequests: 499,
};

const gardeniaInfo = { ...mockInfo['Camellia japonica'], commonName: '梔子花', scientificName: 'Gardenia jasminoides' };

function claudeMessage(payload, stop_reason = 'end_turn') {
  return {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', stop_reason, stop_sequence: null,
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    usage: { input_tokens: 1500, output_tokens: 400 },
  };
}

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });

// Routes fetch by host; records calls and console output.
function stubWorld({ plantnet, claude }) {
  const calls = [];
  const logs = [];
  const realFetch = globalThis.fetch;
  const realLog = console.log;
  const realError = console.error;
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.startsWith('https://my-api.plantnet.org/')) return plantnet();
    if (url.startsWith('https://api.anthropic.com/')) return claude(JSON.parse(init.body));
    throw new Error(`unexpected fetch ${url}`);
  };
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
  return {
    calls,
    logs,
    restore() {
      globalThis.fetch = realFetch;
      console.log = realLog;
      console.error = realError;
    },
  };
}

async function realJpeg() {
  const { default: sharp } = await import('sharp');
  const buf = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#ffffff' } }).jpeg().toBuffer();
  return new File([buf], 'gardenia.jpg', { type: 'image/jpeg' });
}

function realEnv() {
  delete process.env.MOCK_IDENTIFY;
  process.env.PLANTNET_API_KEY = PLANTNET_KEY;
  process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
}

function assertNoKeysLogged(logs) {
  const all = logs.join('\n');
  assert.ok(!all.includes(PLANTNET_KEY), 'Pl@ntNet key leaked into logs');
  assert.ok(!all.includes(ANTHROPIC_KEY), 'Anthropic key leaked into logs');
}

test('missing keys → not_configured, and the log says which', async () => {
  delete process.env.MOCK_IDENTIFY;
  delete process.env.PLANTNET_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const world = stubWorld({ plantnet: () => assert.fail(), claude: () => assert.fail() });
  try {
    const res = await handler(request({ image: jpeg() }));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'not_configured' });
    assert.ok(world.logs.some((l) => l.includes('PLANTNET_API_KEY no, ANTHROPIC_API_KEY no')));
  } finally {
    world.restore();
  }
});

test('real pipeline: resize → Pl@ntNet → Claude → { confidence, candidates, info }', async () => {
  realEnv();
  let claudeBody;
  const world = stubWorld({
    plantnet: () => jsonResponse(plantnetOk),
    claude: (body) => {
      claudeBody = body;
      return jsonResponse(claudeMessage({
        info: gardeniaInfo,
        candidateNames: [
          { scientificName: 'Gardenia jasminoides', commonName: '梔子花' },
          { scientificName: 'Tabernaemontana divaricata', commonName: '馬蹄花' },
          { scientificName: 'Jasminum sambac', commonName: '茉莉花' },
        ],
      }));
    },
  });
  try {
    const res = await handler(request({ image: await realJpeg(), lang: 'zh-TW' }));
    assert.equal(res.status, 200, world.logs.join('\n'));
    const data = await res.json();
    assert.equal(data.confidence, 0.82);
    assert.equal(data.info.commonName, '梔子花');
    assert.deepEqual(data.candidates.map((c) => c.commonName), ['梔子花', '馬蹄花', '茉莉花']);
    assert.deepEqual(data.candidates[0].images, ['https://bs.plantnet.org/m/1.jpg']);

    // Claude got a ≤1200px JPEG and a Sonnet-class model.
    assert.match(claudeBody.model, /sonnet/);
    const img = claudeBody.messages[0].content.find((b) => b.type === 'image');
    assert.equal(img.source.media_type, 'image/jpeg');
    const { default: sharp } = await import('sharp');
    const meta = await sharp(Buffer.from(img.source.data, 'base64')).metadata();
    assert.equal(Math.max(meta.width, meta.height), 1200);

    for (const step of ['request received', 'keys present: PLANTNET_API_KEY yes, ANTHROPIC_API_KEY yes', 'plantnet: HTTP 200', 'claude: HTTP 200', 'done:']) {
      assert.ok(world.logs.some((l) => l.includes(step)), `log missing: ${step}`);
    }
    assertNoKeysLogged(world.logs);
  } finally {
    world.restore();
  }
});

test('Pl@ntNet 404 → no_plant, Claude not called', async () => {
  realEnv();
  const world = stubWorld({
    plantnet: () => jsonResponse({ statusCode: 404, error: 'Not Found', message: 'Species not found' }, 404),
    claude: () => assert.fail('Claude should not be called'),
  });
  try {
    const res = await handler(request({ image: await realJpeg() }));
    assert.equal(res.status, 422);
    assert.deepEqual(await res.json(), { error: 'no_plant' });
    assert.ok(world.logs.some((l) => l.includes('plantnet: HTTP 404')));
  } finally {
    world.restore();
  }
});

test('Pl@ntNet bad key → plantnet_auth, logged without the key', async () => {
  realEnv();
  const world = stubWorld({
    plantnet: () => jsonResponse({ statusCode: 401, error: 'Unauthorized', message: 'Invalid API key' }, 401),
    claude: () => assert.fail(),
  });
  try {
    const res = await handler(request({ image: await realJpeg() }));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'plantnet_auth' });
    assert.ok(world.logs.some((l) => l.includes('Invalid API key')));
    assertNoKeysLogged(world.logs);
  } finally {
    world.restore();
  }
});

test('Claude bad key → claude_auth, logged without the key', async () => {
  realEnv();
  const world = stubWorld({
    plantnet: () => jsonResponse(plantnetOk),
    claude: () => jsonResponse({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401),
  });
  try {
    const res = await handler(request({ image: await realJpeg() }));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'claude_auth' });
    assert.ok(world.logs.some((l) => l.includes('claude: authentication failed')));
    assertNoKeysLogged(world.logs);
  } finally {
    world.restore();
  }
});

test('species skips Pl@ntNet and returns { info }', async () => {
  realEnv();
  const world = stubWorld({
    plantnet: () => assert.fail('Pl@ntNet should not be called'),
    claude: () => jsonResponse(claudeMessage({ ...gardeniaInfo, commonName: '茉莉花', scientificName: 'Jasminum sambac' })),
  });
  try {
    const res = await handler(request({ image: await realJpeg(), species: 'Jasminum sambac' }));
    assert.equal(res.status, 200, world.logs.join('\n'));
    const data = await res.json();
    assert.deepEqual(Object.keys(data), ['info']);
    assert.equal(data.info.commonName, '茉莉花');
  } finally {
    world.restore();
  }
});
