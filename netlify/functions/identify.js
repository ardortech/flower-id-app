// POST /api/identify — multipart form: image, lang, optional lat/lng, optional species.
// Without species: identify the photo → { confidence, candidates, info }.
// With species (a candidate's scientificName, sent after she taps 「就是 X」):
// skip Pl@ntNet and describe that species → { info }.
// Only the MOCK_IDENTIFY path exists so far. Step 3 adds resize → Pl@ntNet → Claude.

import { mockResult, mockLowResult, mockInfo } from '../lib/mock-result.js';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let form;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const image = form.get('image');
  if (!image || typeof image === 'string' || image.size === 0) {
    return json({ error: 'no_image' }, 400);
  }
  if (!ACCEPTED_TYPES.has(image.type)) {
    return json({ error: 'unsupported_type' }, 415);
  }

  const species = form.get('species');
  if (species != null && (typeof species !== 'string' || !species.trim() || species.length > 200)) {
    return json({ error: 'bad_species' }, 400);
  }

  const mock = process.env.MOCK_IDENTIFY;
  if (mock) {
    await sleep(Number(process.env.MOCK_DELAY_MS ?? 1500));
    if (species) {
      const info = mockInfo[species];
      return info ? json({ info }) : json({ error: 'unknown_species' }, 404);
    }
    if (mock === 'no_plant') return json({ error: 'no_plant' }, 422);
    if (mock === 'low') return json(mockLowResult);
    return json(mockResult);
  }

  return json({ error: 'not_implemented' }, 501);
};

export const config = { path: '/api/identify' };
