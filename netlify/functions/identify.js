// POST /api/identify — multipart form: image, lang, optional lat/lng, optional species.
// Without species: resize → Pl@ntNet top 3 → Claude → { confidence, candidates, info }.
// With species (a candidate's scientificName, sent after she taps 「就是 X」):
// skip Pl@ntNet and describe that species → { info }.
// Every step logs to Netlify's function log (never key values).

import { mockResult, mockLowResult, mockInfo } from '../lib/mock-result.js';
import { createLogger } from '../lib/log.js';
import { resizeImage } from '../lib/resize.js';
import { identifyWithPlantNet } from '../lib/plantnet.js';
import { describeWithClaude } from '../lib/claude.js';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
const LANGS = new Set(['zh-TW', 'en']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Error codes the browser turns into a friendly message (only no_plant is special).
const STATUS = { no_plant: 422 };

export default async (req) => {
  const log = createLogger(Math.random().toString(36).slice(2, 8));
  const started = Date.now();
  const fail = (error, status) => {
    log.info(`done: error ${error} (HTTP ${status}) in ${Date.now() - started} ms`);
    return json({ error }, status);
  };

  log.info(`request received: ${req.method}, content-type ${req.headers.get('content-type')?.split(';')[0] ?? 'none'}, content-length ${req.headers.get('content-length') ?? 'unknown'}`);
  if (req.method !== 'POST') return fail('method_not_allowed', 405);

  let form;
  try {
    form = await req.formData();
  } catch (err) {
    log.error('could not read the form data:', err.message);
    return fail('bad_request', 400);
  }

  const image = form.get('image');
  if (!image || typeof image === 'string' || image.size === 0) return fail('no_image', 400);
  const lang = LANGS.has(form.get('lang')) ? form.get('lang') : 'zh-TW';
  const species = form.get('species');
  log.info(
    `image ${image.type || 'no type'} ${image.size} bytes, lang ${lang}, species ${species ? JSON.stringify(species) : 'none'},`,
    `location ${form.get('lat') && form.get('lng') ? 'yes' : 'no'}`
  );
  if (!ACCEPTED_TYPES.has(image.type)) return fail('unsupported_type', 415);
  if (species != null && (typeof species !== 'string' || !species.trim() || species.length > 200)) {
    return fail('bad_species', 400);
  }

  const mock = process.env.MOCK_IDENTIFY;
  if (mock) {
    log.info(`MOCK_IDENTIFY=${mock}: returning a canned result, no API calls`);
    await sleep(Number(process.env.MOCK_DELAY_MS ?? 1500));
    if (species) {
      const info = mockInfo[species];
      return info ? json({ info }) : fail('unknown_species', 404);
    }
    if (mock === 'no_plant') return fail('no_plant', 422);
    return json(mock === 'low' ? mockLowResult : mockResult);
  }

  const plantnetKey = process.env.PLANTNET_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  log.info(`keys present: PLANTNET_API_KEY ${plantnetKey ? 'yes' : 'no'}, ANTHROPIC_API_KEY ${anthropicKey ? 'yes' : 'no'}`);
  if ((!species && !plantnetKey) || !anthropicKey) {
    log.error('missing API key(s): set them in Netlify → Site configuration → Environment variables, then redeploy');
    return fail('not_configured', 500);
  }

  try {
    const original = new Uint8Array(await image.arrayBuffer());
    const resized = await resizeImage(original, log);
    const bytes = resized.bytes;
    const type = resized.type || image.type;
    log.info(`resize: ${original.length} → ${bytes.length} bytes (${type})`);

    if (species) {
      const { info } = await describeWithClaude({ bytes, type, lang, species, candidates: null, apiKey: anthropicKey, log });
      log.info(`done: info for ${species} in ${Date.now() - started} ms`);
      return json({ info });
    }

    const candidates = await identifyWithPlantNet({ bytes, type, apiKey: plantnetKey, log });
    const { info, candidateNames = [] } = await describeWithClaude({
      bytes, type, lang, candidates, species: null, apiKey: anthropicKey, log,
    });
    const names = new Map(candidateNames.map((c) => [c.scientificName, c.commonName]));
    names.set(candidates[0].scientificName, info.commonName);
    for (const c of candidates) c.commonName = names.get(c.scientificName) || '';

    log.info(`done: ${info.commonName} (${candidates[0].scientificName}) in ${Date.now() - started} ms`);
    return json({ confidence: candidates[0].score, candidates, info });
  } catch (err) {
    if (err.code) return fail(err.code, STATUS[err.code] ?? 502);
    log.error('unexpected error:', err?.stack || err);
    return fail('server_error', 500);
  }
};

export const config = { path: '/api/identify' };
