// Pure logic for the guided Ollama setup flow (probe → download → pull →
// connect). Everything network/IPC-shaped lives in ipc/ollama.ts; this module
// is Electron-free so the parsing and validation can be unit-tested.

/** Native Ollama API root (NOT the /v1 OpenAI-compatible base the provider uses). */
export const OLLAMA_API_BASE = 'http://localhost:11434';

/**
 * Models the setup card offers. A curated allowlist — the pull IPC handler
 * refuses anything else, so the renderer can never request arbitrary pulls.
 * Ask InsightLens needs the model to emit strict JSON containing correct
 * SQL, which small chat models are marginal at — hence the coder default.
 */
export const CURATED_OLLAMA_MODELS = [
  {
    id: 'qwen2.5-coder:7b',
    label: 'Recommended',
    description: 'Best at the SQL and JSON behind chart answers',
    sizeGB: 4.7,
  },
  {
    id: 'llama3.2:3b',
    label: 'Fast & small',
    description: 'Quicker and lighter; may struggle with complex questions',
    sizeGB: 2.0,
  },
] as const;

export function isCuratedModel(name: string): boolean {
  return CURATED_OLLAMA_MODELS.some((m) => m.id === name);
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  /** 0-100 when this line carries layer byte counts, otherwise undefined. */
  percent?: number;
}

/**
 * Parse one NDJSON line from Ollama's streaming /api/pull response.
 * Lines look like {"status":"pulling abc","digest":"...","total":N,"completed":N}
 * with bare {"status":"success"} at the end. Returns null for blank or
 * malformed lines so the stream reader can simply skip them.
 */
export function parsePullLine(line: string): PullProgress | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed?.status !== 'string') return null;
  const progress: PullProgress = { status: parsed.status };
  if (typeof parsed.total === 'number' && parsed.total > 0) {
    progress.total = parsed.total;
    const completed = typeof parsed.completed === 'number' ? parsed.completed : 0;
    progress.completed = completed;
    progress.percent = Math.min(100, Math.round((completed / parsed.total) * 100));
  }
  return progress;
}
