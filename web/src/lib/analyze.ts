// Heuristic survey analysis — the try-tool's "brain".
//
// Rule-based, no LLM: compares each agreement dimension against a benchmark
// level, scores overall health, and emits evidence-based recommendations.
// The AI-powered, cross-survey version is a desktop-app upgrade; this gives
// visitors an immediate, honest read of a single survey in the browser.

import type {
  AnalysisResult, Benchmark, PercentageAgreements, QuestionResult,
  Recommendation, SentimentCounts, SurveyData,
} from '../types';
import { analyzeSentimentBatch } from './sentiment';

type CategoryKey = 'engagement' | 'resources' | 'support' | 'assessments' | 'expectations' | 'overall';

const CATEGORY_LABELS: { key: CategoryKey; label: string; advice: string }[] = [
  { key: 'engagement', label: 'Learning activities were engaging', advice: 'Vary in-class activities, add active-learning tasks, and connect activities explicitly to assessment so students feel the time is well spent.' },
  { key: 'resources', label: 'Resources helped learning', advice: 'Audit reading lists and LMS materials for currency and clarity; trim overloaded readings and signpost the most important resources.' },
  { key: 'support', label: 'Learning was supported', advice: 'Improve feedback turnaround, expand consultation/online help channels, and surface support services earlier in the study period.' },
  { key: 'assessments', label: 'Assessments demonstrated learning', advice: 'Realign assessment to learning outcomes, publish annotated exemplars, and make marking criteria explicit before submission.' },
  { key: 'expectations', label: 'Expectations were clear', advice: 'State learning outcomes and assessment criteria up front, repeat them before each task, and check understanding early.' },
  { key: 'overall', label: 'Overall worthwhile experience', advice: 'Treat this as the headline signal: address the weakest dimensions above first — overall satisfaction usually follows them.' },
];

/** Choose the broadest available benchmark for comparison (university → faculty → school → any). */
function pickBenchmark(benchmarks: Benchmark[]): Benchmark | undefined {
  const preferred = ['Curtin', 'Faculty', 'School', 'Overall'];
  for (const level of preferred) {
    const hit = benchmarks.find((b) => b.level === level);
    if (hit) return hit;
  }
  return benchmarks[0];
}

/** Mean of the present agreement values, weighted slightly toward overall. */
function healthScore(pa: PercentageAgreements): number {
  const entries = CATEGORY_LABELS
    .map((c) => ({ k: c.key, v: pa[c.key] }))
    .filter((e): e is { k: CategoryKey; v: number } => typeof e.v === 'number');
  if (entries.length === 0) return 0;
  const weight = (k: CategoryKey) => (k === 'overall' ? 2 : 1);
  const num = entries.reduce((s, e) => s + e.v * weight(e.k), 0);
  const den = entries.reduce((s, e) => s + weight(e.k), 0);
  return Math.round(num / den);
}

function ratingFor(value: number, benchmark: number | undefined): Recommendation['severity'] {
  if (benchmark === undefined) return value < 70 ? 'watch' : 'strength';
  const gap = value - benchmark;
  if (gap <= -5) return 'critical';
  if (gap < 3) return 'watch';
  return 'strength';
}

export function analyzeSurvey(data: SurveyData): AnalysisResult {
  const benchmark = pickBenchmark(data.benchmarks);
  const pa = data.percentage_agreement;

  const questionResults: QuestionResult[] = CATEGORY_LABELS.map((c) => ({
    key: c.key,
    label: c.label,
    value: pa[c.key],
    benchmark: benchmark?.agreement[c.key],
  }));

  const recommendations: Recommendation[] = [];
  for (const c of CATEGORY_LABELS) {
    const value = pa[c.key];
    if (typeof value !== 'number') continue;
    const sev = ratingFor(value, benchmark?.agreement[c.key]);
    const bm = benchmark?.agreement[c.key];
    const gapTxt = typeof bm === 'number'
      ? ` ${value.toFixed(1)}% vs ${bm.toFixed(1)}% benchmark (${value >= bm ? '+' : ''}${(value - bm).toFixed(1)}).`
      : ` ${value.toFixed(1)}% agreement.`;

    if (sev === 'critical') {
      recommendations.push({
        severity: 'critical', area: c.label, title: `Address: ${c.label.toLowerCase()}`,
        detail: `Scored below benchmark.${gapTxt} ${c.advice}`,
      });
    } else if (sev === 'watch') {
      recommendations.push({
        severity: 'watch', area: c.label, title: `Watch: ${c.label.toLowerCase()}`,
        detail: `Close to benchmark.${gapTxt} ${c.advice}`,
      });
    } else {
      recommendations.push({
        severity: 'strength', area: c.label, title: `Preserve: ${c.label.toLowerCase()}`,
        detail: `Above benchmark.${gapTxt} Keep doing what works here.`,
      });
    }
  }

  const rr = data.response_stats.response_rate;
  if (typeof rr === 'number' && rr < 20) {
    recommendations.push({
      severity: 'watch', area: 'Response rate', title: `Low response rate (${rr.toFixed(1)}%)`,
      detail: 'With fewer responses these scores are less stable. Consider in-class survey time or early reminders next offering to broaden representation.',
    });
  }

  const batch = analyzeSentimentBatch(data.comments);
  const sentimentCounts: SentimentCounts = {
    total: batch.total, positive: batch.positive, neutral: batch.neutral, negative: batch.negative,
  };
  if (batch.total > 0 && batch.average.normalized < -0.1) {
    recommendations.push({
      severity: 'critical', area: 'Comment sentiment', title: 'Comments skew negative',
      detail: `Across ${batch.total} comments, sentiment leans negative (avg ${batch.average.normalized.toFixed(2)}). Read the written feedback alongside the scores — it usually names the specific cause behind weak dimensions above.`,
    });
  } else if (batch.total > 0 && batch.average.normalized > 0.1) {
    recommendations.push({
      severity: 'strength', area: 'Comment sentiment', title: 'Comments skew positive',
      detail: `Across ${batch.total} comments, sentiment leans positive (avg ${batch.average.normalized.toFixed(2)} — ${batch.positive} positive, ${batch.negative} negative). Mine the positive comments for what to protect.`,
    });
  }

  const order: Record<Recommendation['severity'], number> = { critical: 0, watch: 1, strength: 2 };
  recommendations.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    data, sentiment: batch.average, sentimentCounts,
    healthScore: healthScore(pa), recommendations, questionResults,
  };
}
