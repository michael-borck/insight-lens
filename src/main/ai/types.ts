// Core types for the AI Client — the single main-process module that talks to an LLM.
// See CONTEXT.md: "AI Client", "Provider", "Effective key".

export type ProviderId =
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'openai'
  | 'custom';

/** What a caller wants generated. The caller owns the prompt; the AI Client owns transport. */
export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens?: number; // default 1000
  temperature?: number; // default 0.1
}

/** Resolved configuration for one request. Built in the main process; the apiKey is the Effective key. */
export interface AiConfig {
  provider: ProviderId;
  /** Overrides the provider's default base URL. Required for the 'custom' provider. */
  baseUrl?: string;
  model: string;
  /** Effective key (stored or env-resolved). Resolved in main, never sent to the renderer. */
  apiKey?: string;
}

/** Thrown by the AI Client on any failure; the IPC handler maps it to a {success,error} envelope. */
export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}
