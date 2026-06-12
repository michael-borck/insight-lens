import { describe, it, expect } from 'vitest';
import { complete, listModels, parseJsonResponse, AiError } from './client';
import { resolveEffectiveKey, hasEnvKey, inferProviderFromUrl } from './providers';
import { Transport, TransportResponse } from './transport';
import { CompleteRequest } from './types';

const REQ: CompleteRequest = { system: 'sys', user: 'hi', maxTokens: 1000, temperature: 0.1 };

function response(opts: { ok: boolean; status?: number; statusText?: string; json?: any; text?: string }): TransportResponse {
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    statusText: opts.statusText ?? '',
    json: async () => opts.json,
    text: async () => opts.text ?? (opts.json ? JSON.stringify(opts.json) : ''),
  };
}

interface Recorded { url: string; headers: Record<string, string>; body: any; }
function recording(res: TransportResponse) {
  const calls: Recorded[] = [];
  const transport: Transport = {
    async post(url, headers, body) { calls.push({ url, headers, body }); return res; },
    async get(url, headers) { calls.push({ url, headers, body: undefined }); return res; },
  };
  return { transport, calls };
}

describe('complete — provider request shaping', () => {
  it('anthropic: /v1/messages, x-api-key + version, system + user message, parses content[0].text', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { content: [{ text: 'A' }] } }));
    const out = await complete(REQ, { provider: 'anthropic', model: 'claude-x', apiKey: 'k' }, transport);

    expect(out).toBe('A');
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(calls[0].headers['x-api-key']).toBe('k');
    expect(calls[0].headers['anthropic-version']).toBe('2023-06-01');
    expect(calls[0].body).toMatchObject({ model: 'claude-x', system: 'sys', max_tokens: 1000 });
    expect(calls[0].body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('openai: /v1/chat/completions, Bearer auth, system+user messages, parses choices[0].message.content', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { choices: [{ message: { content: 'O' } }] } }));
    const out = await complete(REQ, { provider: 'openai', model: 'gpt-x', apiKey: 'sk' }, transport);

    expect(out).toBe('O');
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].headers['Authorization']).toBe('Bearer sk');
    expect(calls[0].body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('gemini: :generateContent with x-goog-api-key header (never in URL), system_instruction body, parses candidates', async () => {
    const json = { candidates: [{ content: { parts: [{ text: 'G' }] } }] };
    const { transport, calls } = recording(response({ ok: true, json }));
    const out = await complete(REQ, { provider: 'gemini', model: 'gemini-x', apiKey: 'gk' }, transport);

    expect(out).toBe('G');
    expect(calls[0].url).toContain('/models/gemini-x:generateContent');
    expect(calls[0].url).not.toContain('key=');
    expect(calls[0].headers['x-goog-api-key']).toBe('gk');
    expect(calls[0].body.system_instruction.parts[0].text).toBe('sys');
    expect(calls[0].body.contents[0].parts[0].text).toBe('hi');
  });

  it('ollama: local /v1/chat/completions, no auth header without a key, OpenAI-compatible shape', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { choices: [{ message: { content: 'L' } }] } }));
    const out = await complete(REQ, { provider: 'ollama', model: 'llama3', apiKey: '' }, transport);

    expect(out).toBe('L');
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].headers['Authorization']).toBeUndefined();
    expect(calls[0].body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('custom: ensures /v1 on a user base URL, OpenAI-compatible shape', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { choices: [{ message: { content: 'C' } }] } }));
    const out = await complete(REQ, { provider: 'custom', baseUrl: 'http://localhost:1234', model: 'm', apiKey: '' }, transport);

    expect(out).toBe('C');
    expect(calls[0].url).toBe('http://localhost:1234/v1/chat/completions');
  });
});

describe('complete — guards and error mapping', () => {
  it('throws before any call when a key-requiring provider has no key', async () => {
    const { transport, calls } = recording(response({ ok: true, json: {} }));
    await expect(complete(REQ, { provider: 'openai', model: 'gpt-x' }, transport)).rejects.toBeInstanceOf(AiError);
    expect(calls).toHaveLength(0);
  });

  it('throws when custom provider has no base URL', async () => {
    const { transport } = recording(response({ ok: true, json: {} }));
    await expect(complete(REQ, { provider: 'custom', model: 'm' }, transport)).rejects.toThrow(/base URL/i);
  });

  it('maps 401 to an invalid-key message', async () => {
    const { transport } = recording(response({ ok: false, status: 401 }));
    await expect(complete(REQ, { provider: 'openai', model: 'm', apiKey: 'k' }, transport)).rejects.toThrow(/Invalid API key/i);
  });

  it('maps 429 to a rate-limit message', async () => {
    const { transport } = recording(response({ ok: false, status: 429 }));
    await expect(complete(REQ, { provider: 'openai', model: 'm', apiKey: 'k' }, transport)).rejects.toThrow(/Rate limit/i);
  });

  it('maps 404 mentioning a model to a model-not-found message', async () => {
    const { transport } = recording(response({ ok: false, status: 404, text: 'model not_found' }));
    await expect(complete(REQ, { provider: 'openai', model: 'ghost', apiKey: 'k' }, transport)).rejects.toThrow(/"ghost" was not found/);
  });

  it('throws when the provider returns no content', async () => {
    const { transport } = recording(response({ ok: true, json: { choices: [] } }));
    await expect(complete(REQ, { provider: 'openai', model: 'm', apiKey: 'k' }, transport)).rejects.toThrow(/No response/i);
  });
});

describe('parseJsonResponse', () => {
  it('parses a bare object', () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });
  it('strips ```json fences', () => {
    expect(parseJsonResponse('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it('strips generic ``` fences', () => {
    expect(parseJsonResponse('```\n{"a":3}\n```')).toEqual({ a: 3 });
  });
  it('extracts a {...} block from surrounding prose', () => {
    expect(parseJsonResponse('Here is the JSON: {"a":4} thanks')).toEqual({ a: 4 });
  });
  it('throws on non-JSON', () => {
    expect(() => parseJsonResponse('not json at all')).toThrow();
  });
});

describe('key resolution & provider inference', () => {
  it('resolveEffectiveKey: a stored key wins over env', () => {
    expect(resolveEffectiveKey('openai', 'stored', { OPENAI_API_KEY: 'env' })).toBe('stored');
  });
  it('resolveEffectiveKey: falls back to the provider env var', () => {
    expect(resolveEffectiveKey('anthropic', '', { ANTHROPIC_API_KEY: 'envA' })).toBe('envA');
  });
  it('resolveEffectiveKey: gemini accepts either GOOGLE or GEMINI key', () => {
    expect(resolveEffectiveKey('gemini', '', { GEMINI_API_KEY: 'g' })).toBe('g');
  });
  it('hasEnvKey: reports presence and the source variable', () => {
    expect(hasEnvKey('groq', { GROQ_API_KEY: 'x' })).toEqual({ hasKey: true, source: 'GROQ_API_KEY' });
    expect(hasEnvKey('groq', {})).toEqual({ hasKey: false, source: 'GROQ_API_KEY' });
  });
  it('inferProviderFromUrl: maps known hosts, defaults to custom', () => {
    expect(inferProviderFromUrl('https://api.anthropic.com')).toBe('anthropic');
    expect(inferProviderFromUrl('https://generativelanguage.googleapis.com')).toBe('gemini');
    expect(inferProviderFromUrl('https://api.groq.com/openai/v1')).toBe('groq');
    expect(inferProviderFromUrl('https://openrouter.ai/api/v1')).toBe('openrouter');
    expect(inferProviderFromUrl('https://api.openai.com/v1')).toBe('openai');
    expect(inferProviderFromUrl('http://localhost:11434/v1')).toBe('custom');
  });
});

describe('listModels', () => {
  it('parses OpenAI-style model lists', async () => {
    const { transport } = recording(response({ ok: true, json: { data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] } }));
    expect(await listModels({ provider: 'openai', model: '', apiKey: 'k' }, transport)).toEqual(['gpt-4o', 'gpt-4o-mini']);
  });
  it('parses gemini model lists, filtering on generateContent support', async () => {
    const json = { models: [
      { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
    ] };
    const { transport } = recording(response({ ok: true, json }));
    expect(await listModels({ provider: 'gemini', model: '', apiKey: 'k' }, transport)).toEqual(['gemini-pro']);
  });
  it('ollama provider: lists models from the OpenAI-compatible /v1/models without auth', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { data: [{ id: 'llama3' }, { id: 'mistral' }] } }));
    expect(await listModels({ provider: 'ollama', model: '', apiKey: '' }, transport)).toEqual(['llama3', 'mistral']);
    expect(calls[0].url).toBe('http://localhost:11434/v1/models');
    expect(calls[0].headers['Authorization']).toBeUndefined();
  });
  it('parses an Ollama tag list from a custom base URL', async () => {
    const { transport, calls } = recording(response({ ok: true, json: { models: [{ name: 'llama3' }] } }));
    const out = await listModels({ provider: 'custom', baseUrl: 'http://localhost:11434/v1', model: '', apiKey: '' }, transport);
    expect(out).toEqual(['llama3']);
    expect(calls[0].url).toBe('http://localhost:11434/api/tags');
  });
  it('returns [] when the models endpoint fails', async () => {
    const { transport } = recording(response({ ok: false, status: 500 }));
    expect(await listModels({ provider: 'openai', model: '', apiKey: 'k' }, transport)).toEqual([]);
  });
});
