// Asks Claude (vision) to describe the flower for an older reader, as JSON.
import Anthropic from '@anthropic-ai/sdk';

// CLAUDE.md: a Sonnet-class model.
const MODEL = 'claude-sonnet-5-5';
const TIMEOUT_MS = 20000;

export class ClaudeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const LANGUAGE_NAMES = { 'zh-TW': 'Traditional Chinese as used in Taiwan (zh-TW)', en: 'English' };

const str = { type: 'string' };
const INFO_SCHEMA = {
  type: 'object',
  properties: {
    commonName: str,
    aliases: { type: 'array', items: str },
    scientificName: str,
    family: str,
    floweringSeason: str,
    origin: str,
    howToRecognize: str,
    flowerMeaning: str,
    careTips: str,
    toxicity: str,
    whereInTaiwan: str,
  },
  required: [
    'commonName', 'aliases', 'scientificName', 'family', 'floweringSeason', 'origin',
    'howToRecognize', 'flowerMeaning', 'careTips', 'toxicity', 'whereInTaiwan',
  ],
  additionalProperties: false,
};

const IDENTIFY_SCHEMA = {
  type: 'object',
  properties: {
    info: INFO_SCHEMA,
    candidateNames: {
      type: 'array',
      items: {
        type: 'object',
        properties: { scientificName: str, commonName: str },
        required: ['scientificName', 'commonName'],
        additionalProperties: false,
      },
    },
  },
  required: ['info', 'candidateNames'],
  additionalProperties: false,
};

function systemPrompt(lang) {
  const language = LANGUAGE_NAMES[lang] || LANGUAGE_NAMES['zh-TW'];
  return `You help an older, non-technical woman in Taiwan learn about flowers she photographs.
Write every value in ${language}, using the plant names commonly used in Taiwan. Keys stay in English.
Write warmly and simply, in short sentences, with no botanical jargon.
- family: family and genus, e.g. 「紫茉莉科・九重葛屬」.
- howToRecognize: 2–3 short sentences about what she can see in the photo or on the plant.
- toxicity: cover people, cats and dogs. If it is not known, say clearly that it is not known. Never say a plant is safe to eat.
- whereInTaiwan: where in Taiwan she is likely to see it.
If you are unsure about any field, say so in that field rather than guess.`;
}

const getClient = (apiKey) => new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

// candidates: Pl@ntNet top 3 (identify), or null when describing a chosen `species`.
export async function describeWithClaude({ bytes, type, lang, candidates, species, apiKey, log }) {
  const target = species || candidates[0].scientificName;
  const task = species
    ? `She says this flower is ${species}. Describe ${species}.`
    : `Pl@ntNet's best match for this photo is ${target} (score ${Math.round(candidates[0].score * 100)}%). ` +
      `Other possibilities: ${candidates.slice(1).map((c) => c.scientificName).join(', ') || 'none'}.\n` +
      `Describe ${target} in "info". In "candidateNames", give the common name for each of: ` +
      `${candidates.map((c) => c.scientificName).join('; ')}.`;

  const started = Date.now();
  let response;
  try {
    response = await getClient(apiKey).beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: species ? INFO_SCHEMA : IDENTIFY_SCHEMA },
      },
      system: systemPrompt(lang),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: type || 'image/jpeg', data: Buffer.from(bytes).toString('base64') } },
            { type: 'text', text: task },
          ],
        },
      ],
    });
  } catch (err) {
    const ms = Date.now() - started;
    if (err instanceof Anthropic.AuthenticationError) {
      log.error(`claude: authentication failed (HTTP 401) after ${ms} ms — check ANTHROPIC_API_KEY`);
      throw new ClaudeError('claude_auth', err.message);
    }
    if (err instanceof Anthropic.RateLimitError) {
      log.error(`claude: rate limited (HTTP 429) after ${ms} ms:`, err.message);
      throw new ClaudeError('claude_rate_limited', err.message);
    }
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      log.error(`claude: timed out after ${ms} ms`);
      throw new ClaudeError('claude_timeout', err.message);
    }
    if (err instanceof Anthropic.APIError) {
      log.error(`claude: HTTP ${err.status ?? 'none'} after ${ms} ms:`, err.message);
      throw new ClaudeError('claude_failed', err.message);
    }
    log.error(`claude: unexpected error after ${ms} ms:`, err?.name, err?.message);
    throw new ClaudeError('claude_failed', String(err?.message));
  }

  const usage = response.usage || {};
  log.info(
    `claude: HTTP 200 in ${Date.now() - started} ms, model ${response.model}, stop_reason ${response.stop_reason},`,
    `tokens in ${usage.input_tokens} out ${usage.output_tokens}`
  );

  if (response.stop_reason === 'refusal') {
    log.error('claude: refused, category:', response.stop_details?.category ?? 'unknown');
    throw new ClaudeError('claude_refused', 'refusal');
  }
  if (response.stop_reason === 'max_tokens') {
    log.error('claude: hit max_tokens before finishing the JSON');
    throw new ClaudeError('claude_failed', 'max_tokens');
  }

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    log.error('claude: response is not valid JSON:', text.slice(0, 300));
    throw new ClaudeError('claude_failed', 'bad JSON');
  }
  return species ? { info: parsed } : parsed;
}
