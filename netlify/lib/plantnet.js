// Pl@ntNet identify: https://my.plantnet.org/doc — POST multipart `images` + `organs`.
const API_URL = 'https://my-api.plantnet.org/v2/identify/all';
const TIMEOUT_MS = 8000;

export class PlantNetError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Returns the top 3: [{ scientificName, score, images: [url] }]. Throws
// PlantNetError('no_plant') when Pl@ntNet finds nothing.
export async function identifyWithPlantNet({ bytes, type, apiKey, log }) {
  const url = new URL(API_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('nb-results', '3');
  url.searchParams.set('include-related-images', 'true');

  const form = new FormData();
  form.append('images', new Blob([bytes], { type: type || 'image/jpeg' }), 'flower.jpg');
  form.append('organs', 'auto');

  const started = Date.now();
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    log.error(`plantnet: request failed after ${Date.now() - started} ms:`, err.name, err.message);
    throw new PlantNetError('plantnet_unreachable', err.message);
  }

  const text = await res.text();
  log.info(`plantnet: HTTP ${res.status} in ${Date.now() - started} ms`);

  // 404 "Species not found" is how Pl@ntNet says there's no plant in the photo.
  if (res.status === 404) throw new PlantNetError('no_plant', 'species not found');
  if (!res.ok) {
    // The body is Pl@ntNet's error message; it never contains our key.
    log.error('plantnet: error body:', text.slice(0, 500));
    const code = res.status === 401 || res.status === 403 ? 'plantnet_auth' : res.status === 429 ? 'plantnet_quota' : 'plantnet_failed';
    throw new PlantNetError(code, `HTTP ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    log.error('plantnet: response is not JSON:', text.slice(0, 200));
    throw new PlantNetError('plantnet_failed', 'bad JSON');
  }

  const candidates = (data.results || []).slice(0, 3).map((r) => ({
    scientificName: r.species?.scientificNameWithoutAuthor || r.species?.scientificName || '',
    score: typeof r.score === 'number' ? r.score : 0,
    images: (r.images || [])
      .map((img) => img?.url?.m || img?.url?.s || img?.url?.o)
      .filter((u) => typeof u === 'string' && u.startsWith('https://'))
      .slice(0, 3),
  })).filter((c) => c.scientificName);

  log.info(
    'plantnet: results',
    candidates.map((c) => `${c.scientificName} ${(c.score * 100).toFixed(1)}%`).join(' | ') || '(none)',
    'remaining quota:',
    data.remainingIdentificationRequests ?? 'unknown'
  );
  if (candidates.length === 0) throw new PlantNetError('no_plant', 'no results');
  return candidates;
}
