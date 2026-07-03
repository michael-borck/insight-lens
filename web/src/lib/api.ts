// Frontend <-> server API. The AI response is LLM-generated, so it is validated
// defensively at the boundary with type guards (no unchecked shape assumptions).

import type { AiPriority, AiRecommendation, AiRecommendationResponse, RecommendationRequest } from '../types';

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isPriority(v: unknown): v is AiPriority {
  return v === 'high' || v === 'medium' || v === 'low';
}

function coerceRec(v: unknown): AiRecommendation | null {
  if (typeof v !== 'object' || v === null) return null;
  const title = 'title' in v && typeof v.title === 'string' ? v.title : '';
  const description = 'description' in v && typeof v.description === 'string' ? v.description : '';
  if (!title && !description) return null;
  return {
    title,
    description,
    category: 'category' in v && typeof v.category === 'string' ? v.category : undefined,
    priority: 'priority' in v && isPriority(v.priority) ? v.priority : undefined,
    evidence: 'evidence' in v && isStringArray(v.evidence) ? v.evidence : undefined,
    actionSteps: 'actionSteps' in v && isStringArray(v.actionSteps) ? v.actionSteps : undefined,
    impact: 'impact' in v && typeof v.impact === 'string' ? v.impact : undefined,
  };
}

function coerceAiResponse(payload: unknown): AiRecommendationResponse {
  if (typeof payload !== 'object' || payload === null) return { recommendations: [] };
  const rawRecs = 'recommendations' in payload && Array.isArray(payload.recommendations) ? payload.recommendations : [];
  const recommendations = rawRecs.map(coerceRec).filter((r): r is AiRecommendation => r !== null);
  const summary = 'summary' in payload && typeof payload.summary === 'string' ? payload.summary : undefined;
  return { recommendations, summary };
}

/** Is the server configured with a working AI provider/model/key? */
export async function fetchAiAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return false;
    const data: unknown = await r.json();
    if (typeof data !== 'object' || data === null || !('ai' in data)) return false;
    const ai = data.ai;
    return typeof ai === 'object' && ai !== null && 'configured' in ai && ai.configured === true;
  } catch {
    return false;
  }
}

export type AiResult =
  | { ok: true; data: AiRecommendationResponse }
  | { ok: false; error: string };

/** Ask the server for AI recommendations over the extracted survey. */
export async function fetchAiRecommendations(req: RecommendationRequest): Promise<AiResult> {
  let r: Response;
  try {
    r = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }

  const data: unknown = await r.json().catch(() => null);
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: `Request failed (${r.status}).` };
  }
  if ('success' in data && data.success === true && 'data' in data) {
    return { ok: true, data: coerceAiResponse(data.data) };
  }
  const error = 'error' in data && typeof data.error === 'string' ? data.error : `Request failed (${r.status}).`;
  return { ok: false, error };
}
