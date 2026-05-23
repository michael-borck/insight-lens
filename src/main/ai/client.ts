// The AI Client: one deep entry point for talking to an LLM. Provider-specific work is
// hidden in the registry; the network is hidden behind the Transport seam. See CONTEXT.md.
import { PROVIDERS } from './providers';
import { Transport, TransportResponse, httpTransport } from './transport';
import { AiConfig, CompleteRequest, AiError } from './types';

export { AiError } from './types';
export type { AiConfig, CompleteRequest, ProviderId } from './types';
export { PROVIDERS, resolveEffectiveKey, hasEnvKey, inferProviderFromUrl } from './providers';

/** Send a single completion request. Returns the assistant's text. Throws AiError on any failure. */
export async function complete(
  req: CompleteRequest,
  cfg: AiConfig,
  transport: Transport = httpTransport,
): Promise<string> {
  const provider = PROVIDERS[cfg.provider];
  if (!provider) throw new AiError(`Unknown AI provider: ${cfg.provider}`);
  if (provider.requiresKey && !cfg.apiKey) {
    throw new AiError('API key is required for this provider. Please configure your API key in Settings.');
  }
  if (cfg.provider === 'custom' && !cfg.baseUrl) {
    throw new AiError('A base URL is required for a custom provider. Please set it in Settings.');
  }

  let res: TransportResponse;
  try {
    res = await transport.post(provider.chatUrl(cfg), provider.chatHeaders(cfg), provider.chatBody(cfg, req));
  } catch (err) {
    throw new AiError(
      `Could not reach the AI service: ${err instanceof Error ? err.message : 'network error'}`,
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw mapHttpError(res.status, res.statusText, errorText, cfg.model);
  }

  const data = await res.json();
  const content = provider.parseChat(data);
  if (!content) throw new AiError('No response from AI');
  return content;
}

/** List the models a provider offers. Returns [] on any failure (used to populate Settings). */
export async function listModels(cfg: AiConfig, transport: Transport = httpTransport): Promise<string[]> {
  const provider = PROVIDERS[cfg.provider];
  if (!provider) return [];
  try {
    const res = await transport.get(provider.modelsUrl(cfg), provider.modelsHeaders(cfg));
    if (!res.ok) return [];
    return provider.parseModels(await res.json());
  } catch {
    return [];
  }
}

/** Probe a provider config to confirm it's reachable and the key works. Never throws. */
export async function testConnection(
  cfg: AiConfig,
  transport: Transport = httpTransport,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const provider = PROVIDERS[cfg.provider];
  if (!provider) return { success: false, error: `Unknown AI provider: ${cfg.provider}` };
  if (provider.requiresKey && !cfg.apiKey) {
    return { success: false, error: 'API key is required for this provider.' };
  }
  if (cfg.provider === 'custom' && !cfg.baseUrl) {
    return { success: false, error: 'A base URL is required for a custom provider.' };
  }
  // A models fetch is cheap and consumes no tokens.
  try {
    const models = await listModels(cfg, transport);
    if (models.length > 0) return { success: true, message: 'Connection successful!' };
  } catch {
    /* fall through to a probe completion */
  }
  // Fallback: a 1-token completion. A 400/429 still proves we reached an authenticated endpoint.
  try {
    await complete({ system: '', user: 'Hi', maxTokens: 1, temperature: 0 }, cfg, transport);
    return { success: true, message: 'Connection successful!' };
  } catch (err) {
    const e = err as AiError;
    if (e.status === 429 || e.status === 400) return { success: true, message: 'Connection successful!' };
    if (e.status === 401) return { success: false, error: 'Invalid API key. Please check your key in Settings.' };
    return { success: false, error: e.message };
  }
}

function mapHttpError(status: number, statusText: string, errorText: string, model: string): AiError {
  if (status === 529 || status === 521) {
    return new AiError(
      `Service temporarily unavailable (Error ${status}). This often happens when the provider is experiencing high traffic. Please try again in a few moments.`,
      status,
    );
  }
  if (status === 401) return new AiError('Invalid API key. Please check your API key in Settings.', status);
  if (status === 429) return new AiError('Rate limit exceeded. Please wait a moment before trying again.', status);
  if (status === 404) {
    if (errorText.includes('model') || errorText.includes('not_found')) {
      return new AiError(`Model "${model}" was not found. Please choose a different model in Settings.`, status);
    }
    return new AiError('Could not reach the AI service. Please check your connection settings.', status);
  }
  if (status === 500 || status === 502 || status === 503) {
    return new AiError(`Server error (${status}). The AI service is temporarily unavailable. Please try again later.`, status);
  }
  return new AiError(`API request failed: ${status} ${statusText}${errorText ? '. ' + errorText : ''}`, status);
}

/** Parse a JSON response that may be wrapped in markdown fences or prose. Throws if no valid JSON. */
export function parseJsonResponse<T = any>(text: string): T {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  }
  if (/^Here'?s? the JSON:/i.test(clean)) {
    clean = clean.replace(/^Here'?s? the JSON:\s*/i, '');
  }
  clean = clean.trim();
  // Extract the first {...} block if there's surrounding prose.
  if (!clean.startsWith('{') && clean.includes('{')) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}') + 1;
    if (start !== -1 && end > start) clean = clean.substring(start, end);
  }
  return JSON.parse(clean) as T;
}
