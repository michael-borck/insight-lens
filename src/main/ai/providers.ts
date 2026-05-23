// The Provider registry: one row per LLM backend. The only place provider-specific
// branching lives (chat shape, models endpoint, env-key names). See CONTEXT.md: "Provider".
import { ProviderId, AiConfig, CompleteRequest } from './types';

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  /** Default base URL; '' for 'custom' (the user must supply one). */
  defaultBaseUrl: string;
  /** Environment variables checked, in order, to resolve the Effective key. */
  envKeys: string[];
  /** Hard pre-check: reject before calling when no key (behaviour-preserving: anthropic, openai). */
  requiresKey: boolean;
  chatUrl(cfg: AiConfig): string;
  chatHeaders(cfg: AiConfig): Record<string, string>;
  chatBody(cfg: AiConfig, req: CompleteRequest): unknown;
  parseChat(data: any): string | undefined;
  modelsUrl(cfg: AiConfig): string;
  modelsHeaders(cfg: AiConfig): Record<string, string>;
  parseModels(data: any): string[];
}

const ensureV1 = (url: string): string =>
  url.endsWith('/v1') ? url : url.replace(/\/+$/, '') + '/v1';

const bearer = (cfg: AiConfig): Record<string, string> =>
  cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};

const openAiChatBody = (cfg: AiConfig, req: CompleteRequest) => ({
  model: cfg.model,
  messages: [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ],
  temperature: req.temperature ?? 0.1,
  max_tokens: req.maxTokens ?? 1000,
});

const parseOpenAiChat = (data: any): string | undefined => data?.choices?.[0]?.message?.content;
const parseOpenAiModels = (data: any): string[] => (data?.data || []).map((m: any) => m.id).filter(Boolean);

/** An OpenAI-compatible hosted provider (groq, openrouter): fixed base URL, Bearer auth. */
function openAiCompatible(
  id: ProviderId,
  label: string,
  baseUrl: string,
  envKeys: string[],
): ProviderSpec {
  return {
    id,
    label,
    defaultBaseUrl: baseUrl,
    envKeys,
    requiresKey: false,
    chatUrl: () => baseUrl + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: parseOpenAiChat,
    modelsUrl: () => baseUrl + '/models',
    modelsHeaders: (cfg) => ({ ...bearer(cfg) }),
    parseModels: parseOpenAiModels,
  };
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultBaseUrl: 'https://api.anthropic.com',
    envKeys: ['ANTHROPIC_API_KEY'],
    requiresKey: true,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.anthropic.com') + '/messages',
    chatHeaders: (cfg) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) {
        headers['x-api-key'] = cfg.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      }
      return headers;
    },
    chatBody: (cfg, req) => ({
      model: cfg.model,
      max_tokens: req.maxTokens ?? 1000,
      temperature: req.temperature ?? 0.1,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    }),
    parseChat: (data) => data?.content?.[0]?.text,
    modelsUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.anthropic.com') + '/models?limit=100',
    modelsHeaders: (cfg) => {
      const headers: Record<string, string> = {};
      if (cfg.apiKey) {
        headers['x-api-key'] = cfg.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      }
      return headers;
    },
    parseModels: parseOpenAiModels,
  },

  gemini: {
    id: 'gemini',
    label: 'Google (Gemini)',
    defaultBaseUrl: GEMINI_BASE,
    envKeys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    requiresKey: false,
    chatUrl: (cfg) =>
      `${cfg.baseUrl || GEMINI_BASE}/models/${cfg.model}:generateContent?key=${cfg.apiKey ?? ''}`,
    chatHeaders: () => ({ 'Content-Type': 'application/json' }),
    chatBody: (_cfg, req) => ({
      system_instruction: { parts: [{ text: req.system }] },
      contents: [{ parts: [{ text: req.user }] }],
      generationConfig: { temperature: req.temperature ?? 0.1, maxOutputTokens: req.maxTokens ?? 1000 },
    }),
    parseChat: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text,
    modelsUrl: (cfg) => `${cfg.baseUrl || GEMINI_BASE}/models?key=${cfg.apiKey ?? ''}`,
    modelsHeaders: () => ({}),
    parseModels: (data) =>
      (data?.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => (m.name || '').replace('models/', ''))
        .filter(Boolean),
  },

  groq: openAiCompatible('groq', 'Groq', 'https://api.groq.com/openai/v1', ['GROQ_API_KEY']),

  openrouter: openAiCompatible('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', [
    'OPENROUTER_API_KEY',
  ]),

  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    envKeys: ['OPENAI_API_KEY'],
    requiresKey: true,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.openai.com/v1') + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: parseOpenAiChat,
    modelsUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.openai.com/v1') + '/models',
    modelsHeaders: (cfg) => ({ ...bearer(cfg) }),
    parseModels: parseOpenAiModels,
  },

  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: '',
    envKeys: [],
    requiresKey: false,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || '') + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: parseOpenAiChat,
    modelsUrl: (cfg) => {
      const base = cfg.baseUrl || '';
      const isOllama = base.includes('ollama') || base.includes(':11434');
      if (isOllama) return base.replace('/v1', '').replace(/\/+$/, '') + '/api/tags';
      return ensureV1(base) + '/models';
    },
    modelsHeaders: (cfg) => ({ ...bearer(cfg) }),
    // Ollama returns {models:[{name}]}; OpenAI-compatible returns {data:[{id}]}.
    parseModels: (data) => {
      if (data?.data) return data.data.map((m: any) => m.id).filter(Boolean);
      if (data?.models)
        return data.models.map((m: any) => (typeof m === 'string' ? m : m.name || m.id)).filter(Boolean);
      return [];
    },
  },
};

/** Resolve the Effective key: a stored key wins; otherwise the first present env var for the provider. */
export function resolveEffectiveKey(
  provider: ProviderId,
  storedKey: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (storedKey) return storedKey;
  for (const key of PROVIDERS[provider].envKeys) {
    if (env[key]) return env[key] as string;
  }
  return '';
}

/** Whether an env key exists for the provider, and which variable it is. */
export function hasEnvKey(
  provider: ProviderId,
  env: NodeJS.ProcessEnv = process.env,
): { hasKey: boolean; source: string | null } {
  const spec = PROVIDERS[provider];
  for (const key of spec.envKeys) {
    if (env[key]) return { hasKey: true, source: key };
  }
  return { hasKey: false, source: spec.envKeys[0] ?? null };
}

/** Migration helper: infer the provider from a legacy apiUrl, once. */
export function inferProviderFromUrl(apiUrl: string): ProviderId {
  const u = (apiUrl || '').toLowerCase();
  if (u.includes('anthropic.com')) return 'anthropic';
  if (u.includes('googleapis.com')) return 'gemini';
  if (u.includes('groq.com')) return 'groq';
  if (u.includes('openrouter.ai')) return 'openrouter';
  if (u.includes('openai.com')) return 'openai';
  return 'custom';
}
