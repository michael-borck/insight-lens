// Server-side AI types. Lean port of the desktop app's src/main/ai/types.ts —
// no Electron dependencies, so the Docker container runs plain Node.

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'custom';

/** What a caller wants generated. The caller owns the prompt. */
export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

/** Resolved configuration for one request. apiKey is the Effective key. */
export interface AiConfig {
  provider: ProviderId;
  baseUrl?: string;
  model: string;
  apiKey?: string;
}

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}
