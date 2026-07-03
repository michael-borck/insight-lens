// Resolve AI configuration from environment, validate incoming requests, and
// report status. Env is passed explicitly (default process.env) for testability.

import { PROVIDERS, resolveEffectiveKey, isValidProvider } from './ai/providers';
import type { AiConfig, ProviderId } from './ai/types';
import type { RecommendationPayload } from './ai/prompt';

export interface AiStatus {
  configured: boolean;
  provider?: ProviderId;
  model?: string;
  hasKey: boolean;
  reason?: string;
}

/** Build the resolved AiConfig, or null with a reason if AI is unusable. */
export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): { config: AiConfig | null; status: AiStatus } {
  const providerRaw = env.AI_PROVIDER ?? 'openai';
  if (!isValidProvider(providerRaw)) {
    return { config: null, status: { configured: false, hasKey: false, reason: `AI_PROVIDER "${providerRaw}" is not supported` } };
  }
  const provider = providerRaw;
  const spec = PROVIDERS[provider];
  const model = env.AI_MODEL ?? '';
  if (!model) {
    return { config: null, status: { configured: false, provider, hasKey: false, reason: 'AI_MODEL is not set' } };
  }
  const baseUrl = env.AI_BASE_URL || spec.defaultBaseUrl || undefined;
  const apiKey = resolveEffectiveKey(provider, env) || undefined;

  if (spec.requiresKey && !apiKey) {
    return { config: null, status: { configured: false, provider, model, hasKey: false, reason: `No API key for ${spec.label}` } };
  }
  if (provider === 'custom' && !baseUrl) {
    return { config: null, status: { configured: false, provider, model, hasKey: !!apiKey, reason: 'AI_BASE_URL is required for the custom provider' } };
  }
  return { config: { provider, baseUrl, model, apiKey }, status: { configured: true, provider, model, hasKey: !!apiKey } };
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** Validate the browser's payload at the boundary. */
export function isRecommendationPayload(v: unknown): v is RecommendationPayload {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.dimensions)) return false;
  for (const d of obj.dimensions) {
    if (typeof d !== 'object' || d === null) return false;
    const dim = d as Record<string, unknown>;
    if (typeof dim.label !== 'string') return false;
    if (dim.value !== undefined && !isNum(dim.value)) return false;
    if (dim.benchmark !== undefined && !isNum(dim.benchmark)) return false;
  }
  if (typeof obj.sentiment !== 'object' || obj.sentiment === null) return false;
  const s = obj.sentiment as Record<string, unknown>;
  if (![s.total, s.positive, s.neutral, s.negative, s.average].every(isNum)) return false;
  if (!Array.isArray(obj.comments) || !obj.comments.every(isStr)) return false;
  return true;
}
