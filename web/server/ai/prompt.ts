// Recommendation prompt building — adapts the desktop app's
// src/main/ai/recommendations.ts to the web tool's payload shape.
// Domain-specific (knows surveys); the AI Client only transports.

export interface ModelCapabilities {
  isLargeModel: boolean;
  isLocal: boolean;
  hasAdvancedReasoning: boolean;
}

/** Coarse capability detection used to size the recommendation prompt. */
export function getModelCapabilities(modelName: string, baseUrl: string): ModelCapabilities {
  const model = (modelName || '').toLowerCase();
  const url = (baseUrl || '').toLowerCase();
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama');
  const isLargeModel =
    model.includes('gpt-4') || model.includes('claude-3') || model.includes('claude-4') ||
    model.includes('opus') || model.includes('sonnet');
  const hasAdvancedReasoning =
    isLargeModel || model.includes('turbo') || model.includes('llama-3') || (!isLocal && !model.includes('mini'));
  return { isLargeModel, isLocal, hasAdvancedReasoning };
}

/** What the browser sends: the extracted survey, summarised for the prompt. */
export interface RecommendationPayload {
  unit: { code?: string; name?: string; term?: string; year?: string; campus?: string; mode?: string };
  responses?: { enrolments?: number; responses?: number; responseRate?: number };
  dimensions: { label: string; value?: number; benchmark?: number }[];
  sentiment: { total: number; positive: number; neutral: number; negative: number; average: number };
  comments: string[];
}

export interface CompleteRequestLike {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

const JSON_SCHEMA = `{
  "recommendations": [
    {
      "category": "content | delivery | assessment | engagement | support | resources",
      "title": "Specific, actionable title",
      "description": "Detailed explanation of the issue and proposed solution",
      "priority": "high | medium | low",
      "evidence": ["Specific survey metric or benchmark", "Comment theme"],
      "actionSteps": ["Concrete step 1", "Concrete step 2"],
      "impact": "Expected improvement in student experience"
    }
  ],
  "summary": "Executive summary of the most critical opportunities"
}`;

function contextBlock(p: RecommendationPayload): string {
  const u = p.unit;
  const lines: string[] = [];
  lines.push('Unit Survey:');
  if (u.code || u.name) lines.push(`- Unit: ${[u.code, u.name].filter(Boolean).join(' — ')}`);
  if (u.term || u.year) lines.push(`- Period: ${[u.term, u.year].filter(Boolean).join(' ')}`);
  if (u.campus || u.mode) lines.push(`- Offering: ${[u.campus, u.mode].filter(Boolean).join(', ')}`);
  if (p.responses) {
    if (typeof p.responses.responseRate === 'number') {
      const r = p.responses;
      const denom = typeof r.enrolments === 'number' && typeof r.responses === 'number'
        ? ` (${r.responses}/${r.enrolments} students)` : '';
      lines.push(`- Response rate: ${r.responseRate}%${denom}`);
    }
  }

  const dims = p.dimensions.filter((d) => typeof d.value === 'number');
  if (dims.length > 0) {
    lines.push('', 'Agreement (% agree):');
    for (const d of dims) {
      const bench = typeof d.benchmark === 'number' ? ` (benchmark ${d.benchmark}%)` : '';
      lines.push(`- ${d.label}: ${d.value}%${bench}`);
    }
  }

  if (p.sentiment.total > 0) {
    lines.push(
      '', 'Comment sentiment:',
      `- ${p.sentiment.total} comments; average ${p.sentiment.average.toFixed(2)} on a -1..1 scale`,
      `- Positive ${p.sentiment.positive}, neutral ${p.sentiment.neutral}, negative ${p.sentiment.negative}`,
    );
    const sample = p.comments.slice(0, 6);
    if (sample.length > 0) {
      lines.push('', 'Sample comments:');
      for (const c of sample) lines.push(`- "${c.slice(0, 280)}"`);
    }
  }
  return lines.join('\n');
}

/** Build the {system, user} request for an improvement-consultant completion. */
export function buildRecommendationRequest(
  payload: RecommendationPayload,
  capabilities: ModelCapabilities,
): CompleteRequestLike {
  const context = contextBlock(payload);

  if (capabilities.isLocal && !capabilities.isLargeModel) {
    return {
      system: `You are a course improvement consultant. Analyse this unit survey data and give 3-5 actionable recommendations.

CRITICAL: Return ONLY valid JSON in this exact shape, no markdown or prose:
${JSON_SCHEMA}

Focus on the lowest-scoring dimensions, negative comments, and clear implementable actions.`,
      user: context,
      maxTokens: 1200,
      temperature: 0.2,
    };
  }

  return {
    system: `You are an expert educational consultant specialising in course improvement from student survey data. Analyse the survey and give evidence-based recommendations.

Analysis framework:
1. Identify dimensions underperforming relative to benchmark.
2. Read the comment sentiment for qualitative causes behind the numbers.
3. Prioritise by impact potential and feasibility.
4. Give specific, actionable steps for each recommendation.

Return ONLY valid JSON in this exact shape, no markdown or prose:
${JSON_SCHEMA}

Categories: content, delivery, assessment, engagement, support, resources.
Priorities: high, medium, low.`,
    user: context,
    maxTokens: 1600,
    temperature: 0.2,
  };
}
