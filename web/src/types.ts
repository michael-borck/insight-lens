// Types shared across the web landing page and the try-before-install tool.
// Mirrors the desktop app's SurveyData shape (src/main/pdfExtractor.ts) but
// kept self-contained so the web build has no dependency on the Electron app.

export interface UnitInfo {
  unit_code?: string;
  unit_name?: string;
  campus_name?: string;
  mode?: string;
  term?: string;
  year?: string;
}

export interface ResponseStats {
  enrollments?: number;
  responses?: number;
  response_rate?: number;
}

// Curtin-style eVALUate agreement percentages (0-100).
export interface PercentageAgreements {
  engagement?: number;
  resources?: number;
  support?: number;
  assessments?: number;
  expectations?: number;
  overall?: number;
  [key: string]: number | undefined;
}

export interface Benchmark {
  /** Benchmark level, e.g. "Overall", "School", "Faculty", "Curtin". */
  level: string;
  /** The six Curtin eVALUate agreement percentages for this level. */
  agreement: PercentageAgreements;
}

export interface SurveyData {
  unit_info: UnitInfo;
  response_stats: ResponseStats;
  percentage_agreement: PercentageAgreements;
  benchmarks: Benchmark[];
  detailed_results: Record<string, unknown>;
  comments: string[];
}

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  score: number;
  normalized: number; // -1 .. 1
  label: SentimentLabel;
}

export interface SentimentCounts {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface Recommendation {
  /** severity drives colour + ordering */
  severity: 'critical' | 'watch' | 'strength';
  area: string;
  title: string;
  detail: string;
}

export interface QuestionResult {
  key: string;
  label: string;
  value: number | undefined;
  benchmark?: number;
}

export interface AnalysisResult {
  data: SurveyData;
  sentiment: SentimentResult;
  sentimentCounts: SentimentCounts;
  healthScore: number; // 0-100
  recommendations: Recommendation[];
  questionResults: QuestionResult[];
}

// ── AI recommendations (server /api/recommend) ──────────────────────────────

/** Request body the browser posts to /api/recommend. */
export interface RecommendationRequest {
  unit: { code?: string; name?: string; term?: string; year?: string; campus?: string; mode?: string };
  responses?: { enrolments?: number; responses?: number; responseRate?: number };
  dimensions: { label: string; value?: number; benchmark?: number }[];
  sentiment: { total: number; positive: number; neutral: number; negative: number; average: number };
  comments: string[];
}

export type AiPriority = 'high' | 'medium' | 'low';

export interface AiRecommendation {
  category?: string;
  title: string;
  description: string;
  priority?: AiPriority;
  evidence?: string[];
  actionSteps?: string[];
  impact?: string;
}

export interface AiRecommendationResponse {
  recommendations: AiRecommendation[];
  summary?: string;
}

export interface AiHealth {
  ok: boolean;
  ai: { configured: boolean; provider?: string; model?: string; reason?: string };
}
