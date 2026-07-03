// The AI Client — one entry point for talking to an LLM. Provider-specific work
// is hidden in the registry; the network is global fetch (Node 18+). Port of the
// desktop app's src/main/ai/client.ts, stripped of Electron coupling.

import { PROVIDERS } from './providers';
import type { AiConfig, CompleteRequest } from './types';
import { AiError } from './types';

/** Send a single completion request. Returns the assistant's text. Throws AiError. */
export async function complete(req: CompleteRequest, cfg: AiConfig): Promise<string> {
  const provider = PROVIDERS[cfg.provider];
  if (!provider) throw new AiError(`Unknown AI provider: ${cfg.provider}`);
  if (provider.requiresKey && !cfg.apiKey) {
    throw new AiError('API key is required for this provider. Set it in .env (AI_API_KEY or the provider variable).');
  }
  if (cfg.provider === 'custom' && !cfg.baseUrl) {
    throw new AiError('A base URL is required for the custom provider. Set AI_BASE_URL in .env.');
  }

  let res: Response;
  try {
    res = await fetch(provider.chatUrl(cfg), {
      method: 'POST',
      headers: provider.chatHeaders(cfg),
      body: JSON.stringify(provider.chatBody(cfg, req)),
    });
  } catch (err) {
    throw new AiError(
      `Could not reach ${provider.label}: ${err instanceof Error ? err.message : 'network error'}`,
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new AiError(mapHttpError(res.status, res.statusText, errorText, cfg.model), res.status);
  }

  const data: unknown = await res.json();
  const content = provider.parseChat(data);
  if (!content) throw new AiError('The AI returned no usable content.');
  return content;
}

function mapHttpError(status: number, statusText: string, errorText: string, model: string): string {
  const snippet = errorText.slice(0, 300);
  if (status === 401 || status === 403) return `Authentication failed (${status}). Check the API key for model "${model}". ${snippet}`;
  if (status === 404) return `Model "${model}" not found (404). Check AI_MODEL. ${snippet}`;
  if (status === 429) return `Rate limited (429). Slow down or check quota. ${snippet}`;
  return `AI request failed: ${status} ${statusText}. ${snippet}`;
}

/** Parse a JSON object the model may have wrapped in markdown fences or prose. Throws on failure. */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AiError('The AI response was not valid JSON.');
  }
  const jsonText = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonText) as T;
  } catch (err) {
    throw new AiError(`The AI response was not valid JSON: ${err instanceof Error ? err.message : 'parse error'}`);
  }
}
