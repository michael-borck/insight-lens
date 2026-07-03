// Provider registry — lean port of the desktop app's src/main/ai/providers.ts.
// One row per LLM backend; the only place provider-specific branching lives.
// Models endpoints are dropped (the server uses AI_MODEL from env, never lists).

import type { AiConfig, CompleteRequest, ProviderId } from './types';

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  envKeys: string[];
  requiresKey: boolean;
  chatUrl(cfg: AiConfig): string;
  chatHeaders(cfg: AiConfig): Record<string, string>;
  chatBody(cfg: AiConfig, req: CompleteRequest): unknown;
  parseChat(data: unknown): string | undefined;
}

const ensureV1 = (url: string): string => (url.endsWith('/v1') ? url : url.replace(/\/+$/, '') + '/v1');

const bearer = (cfg: AiConfig): Record<string, string> =>
  cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};

const openAiChatBody = (cfg: AiConfig, req: CompleteRequest) => ({
  model: cfg.model,
  messages: [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ],
  temperature: req.temperature ?? 0.1,
  max_tokens: req.maxTokens ?? 1200,
});

// ── response parsers (validate at the boundary — no unchecked shape assumptions) ──

function openAiContent(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('choices' in data) || !Array.isArray(data.choices)) return undefined;
  const first = data.choices[0];
  if (typeof first !== 'object' || first === null || !('message' in first)) return undefined;
  const msg = first.message;
  if (typeof msg !== 'object' || msg === null || !('content' in msg)) return undefined;
  const content = msg.content;
  return typeof content === 'string' ? content : undefined;
}

function anthropicContent(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('content' in data) || !Array.isArray(data.content)) return undefined;
  const first = data.content[0];
  if (typeof first !== 'object' || first === null || !('text' in first)) return undefined;
  const text = first.text;
  return typeof text === 'string' ? text : undefined;
}

function geminiContent(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('candidates' in data) || !Array.isArray(data.candidates)) return undefined;
  const first = data.candidates[0];
  if (typeof first !== 'object' || first === null || !('content' in first)) return undefined;
  const content = first.content;
  if (typeof content !== 'object' || content === null || !('parts' in content) || !Array.isArray(content.parts)) return undefined;
  const part = content.parts[0];
  if (typeof part !== 'object' || part === null || !('text' in part)) return undefined;
  const text = part.text;
  return typeof text === 'string' ? text : undefined;
}

/** OpenAI-compatible hosted provider: fixed base URL, Bearer auth, OpenAI shape. */
function openAiCompatible(id: ProviderId, label: string, baseUrl: string, envKeys: string[]): ProviderSpec {
  return {
    id, label, defaultBaseUrl: baseUrl, envKeys, requiresKey: false,
    chatUrl: () => baseUrl + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: openAiContent,
  };
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  openai: {
    id: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1',
    envKeys: ['OPENAI_API_KEY'], requiresKey: true,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.openai.com/v1') + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: openAiContent,
  },
  anthropic: {
    id: 'anthropic', label: 'Anthropic (Claude)', defaultBaseUrl: 'https://api.anthropic.com',
    envKeys: ['ANTHROPIC_API_KEY'], requiresKey: true,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || 'https://api.anthropic.com') + '/messages',
    chatHeaders: (cfg) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) { headers['x-api-key'] = cfg.apiKey; headers['anthropic-version'] = '2023-06-01'; }
      return headers;
    },
    chatBody: (cfg, req) => ({
      model: cfg.model,
      max_tokens: req.maxTokens ?? 1200,
      temperature: req.temperature ?? 0.1,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    }),
    parseChat: anthropicContent,
  },
  gemini: {
    id: 'gemini', label: 'Google (Gemini)', defaultBaseUrl: GEMINI_BASE,
    envKeys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], requiresKey: false,
    chatUrl: (cfg) => `${cfg.baseUrl || GEMINI_BASE}/models/${cfg.model}:generateContent`,
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...(cfg.apiKey ? { 'x-goog-api-key': cfg.apiKey } : {}) }),
    chatBody: (_cfg, req) => ({
      system_instruction: { parts: [{ text: req.system }] },
      contents: [{ parts: [{ text: req.user }] }],
      generationConfig: { temperature: req.temperature ?? 0.1, maxOutputTokens: req.maxTokens ?? 1200 },
    }),
    parseChat: geminiContent,
  },
  groq: openAiCompatible('groq', 'Groq', 'https://api.groq.com/openai/v1', ['GROQ_API_KEY']),
  openrouter: openAiCompatible('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', ['OPENROUTER_API_KEY']),
  ollama: openAiCompatible('ollama', 'Ollama (local)', 'http://localhost:11434/v1', ['OLLAMA_API_KEY']),
  custom: {
    id: 'custom', label: 'Custom (OpenAI-compatible)', defaultBaseUrl: '', envKeys: [], requiresKey: false,
    chatUrl: (cfg) => ensureV1(cfg.baseUrl || '') + '/chat/completions',
    chatHeaders: (cfg) => ({ 'Content-Type': 'application/json', ...bearer(cfg) }),
    chatBody: openAiChatBody,
    parseChat: openAiContent,
  },
};

/** Resolve the Effective key: an explicit AI_API_KEY wins; else the first provider env var. */
export function resolveEffectiveKey(provider: ProviderId, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.AI_API_KEY;
  if (typeof explicit === 'string' && explicit) return explicit;
  for (const key of PROVIDERS[provider].envKeys) {
    const v = env[key];
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

export function isValidProvider(v: unknown): v is ProviderId {
  return typeof v === 'string' && v in PROVIDERS;
}
