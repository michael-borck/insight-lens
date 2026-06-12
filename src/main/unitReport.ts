// Unit PDF report builder. Pure function over a database connection —
// gathers a unit's data via the Query Repository functions and renders a
// print-oriented HTML document (the IPC handler feeds the HTML to
// exportHtmlToPdf). The generated date is passed in by the caller so this
// module stays deterministic and testable.
import type { DatabaseSync } from 'node:sqlite';
import {
  getUnit,
  getUnitSurveyHistory,
  getUnitComments,
  getSurveyQuestions,
  getSurveyBenchmarks,
} from './queries/unitDetail';

type DB = DatabaseSync;

const MAX_COMMENTS_PER_LIST = 10;
// Plenty for any real unit; getUnitComments defaults to 50, which would
// silently truncate the sentiment counts for comment-heavy units.
const COMMENT_FETCH_LIMIT = 10_000;

interface SurveyRow {
  survey_id: number;
  year: number;
  semester: string;
  location: string;
  mode: string;
  enrolments: number;
  responses: number;
  response_rate: number;
  overall_experience: number;
}

interface CommentRow {
  comment_text: string;
  sentiment_score: number | null;
  sentiment_label: string | null;
  year: number;
  semester: string;
}

interface QuestionRow {
  question_short: string;
  question_text: string;
  percent_agree: number;
}

interface BenchmarkRow {
  question_short: string;
  question_text: string;
  group_type: string;
  group_description: string;
  benchmark_score: number;
  unit_score: number;
  difference: number;
}

/** Escape user-provided text (comments, names) for safe HTML embedding. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`;
}

function commentBlock(comments: CommentRow[]): string {
  return comments
    .map(
      (c) => `
    <div class="comment">"${escapeHtml(c.comment_text)}" <span class="comment-period">— ${escapeHtml(c.semester)} ${c.year}</span></div>`,
    )
    .join('');
}

/**
 * Build the complete HTML document for a unit's survey report.
 * Throws if the unit doesn't exist (the IPC handler turns that into
 * { success: false, error }).
 */
export function buildUnitReportHtml(db: DB, unitCode: string, generatedDate: Date): string {
  const unit = getUnit(db, { unitCode }) as
    | { unit_code: string; unit_name: string; discipline_name: string; academic_level: string }
    | undefined;
  if (!unit) {
    throw new Error(`Unit ${unitCode} not found`);
  }

  const history = getUnitSurveyHistory(db, { unitCode }) as unknown as SurveyRow[];
  const latest = history[0];
  const latestQuestions = latest
    ? (getSurveyQuestions(db, { surveyId: latest.survey_id }) as unknown as QuestionRow[])
    : [];
  const benchmarks = latest
    ? (getSurveyBenchmarks(db, { surveyId: latest.survey_id }) as unknown as BenchmarkRow[])
    : [];
  const comments = getUnitComments(db, {
    unitCode,
    limit: COMMENT_FETCH_LIMIT,
  }) as unknown as CommentRow[];

  // Sentiment counts come from the labels assigned at import time.
  const sentimentCounts = {
    positive: comments.filter((c) => c.sentiment_label === 'positive').length,
    neutral: comments.filter((c) => c.sentiment_label === 'neutral').length,
    negative: comments.filter((c) => c.sentiment_label === 'negative').length,
  };

  // Most positive / most negative by sentiment_score. Comments without a
  // score can't be ranked, so they're excluded from these lists (they still
  // count toward the totals above).
  const scored = comments
    .filter((c) => c.sentiment_score !== null && c.sentiment_score !== undefined)
    .sort((a, b) => (b.sentiment_score as number) - (a.sentiment_score as number));
  const topPositive = scored
    .filter((c) => (c.sentiment_score as number) > 0)
    .slice(0, MAX_COMMENTS_PER_LIST);
  const topNegative = scored
    .filter((c) => (c.sentiment_score as number) < 0)
    .slice(-MAX_COMMENTS_PER_LIST)
    .reverse();

  const academicLevel = unit.academic_level === 'UG' ? 'Undergraduate' : 'Postgraduate';

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Unit Survey Report - ${escapeHtml(unitCode)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #2c3e50; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    h3 { color: #7f8c8d; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #ecf0f1; text-align: left; padding: 8px; border-bottom: 2px solid #bdc3c7; font-size: 13px; text-transform: uppercase; color: #7f8c8d; }
    td { padding: 8px; border-bottom: 1px solid #ecf0f1; font-size: 14px; }
    .metric { background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .sentiment-grid { display: flex; gap: 15px; margin: 15px 0; }
    .sentiment-card { flex: 1; text-align: center; padding: 12px; border-radius: 5px; }
    .sentiment-positive { background: #d4edda; color: #155724; }
    .sentiment-neutral { background: #ecf0f1; color: #555; }
    .sentiment-negative { background: #f8d7da; color: #721c24; }
    .sentiment-value { font-size: 22px; font-weight: bold; }
    .comment { font-style: italic; color: #555; margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #bdc3c7; }
    .comment-period { font-style: normal; color: #95a5a6; font-size: 12px; }
    .above { color: #27ae60; font-weight: bold; }
    .below { color: #e74c3c; font-weight: bold; }
    .empty { color: #95a5a6; font-style: italic; }
    footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 12px; }
    @media print { body { max-width: 100%; } }
  </style>
</head>
<body>
  <h1>Unit Survey Report</h1>
  <p><strong>Unit:</strong> ${escapeHtml(unit.unit_code)} - ${escapeHtml(unit.unit_name)}</p>
  <p><strong>Discipline:</strong> ${escapeHtml(unit.discipline_name)} (${academicLevel})</p>
  <p><strong>Generated:</strong> ${generatedDate.toLocaleDateString()}</p>

  <h2>Survey History</h2>
  ${history.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th>Location</th>
        <th>Mode</th>
        <th>Responses</th>
        <th>Response Rate</th>
        <th>Overall Experience</th>
      </tr>
    </thead>
    <tbody>
      ${history.map((s) => `
      <tr>
        <td>${escapeHtml(s.semester)} ${s.year}</td>
        <td>${escapeHtml(s.location)}</td>
        <td>${escapeHtml(s.mode)}</td>
        <td>${s.responses}/${s.enrolments}</td>
        <td>${fmtPct(s.response_rate)}</td>
        <td>${fmtPct(s.overall_experience)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<p class="empty">No surveys recorded for this unit.</p>`}

  ${latest ? `
  <h2>Latest Survey Results (${escapeHtml(latest.semester)} ${latest.year})</h2>
  ${latestQuestions.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Agreement</th>
      </tr>
    </thead>
    <tbody>
      ${latestQuestions.map((q) => `
      <tr>
        <td>${escapeHtml(q.question_text)}</td>
        <td>${fmtPct(q.percent_agree)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<p class="empty">No per-question results recorded for the latest survey.</p>`}` : ''}

  ${benchmarks.length > 0 ? `
  <h2>Benchmark Comparison (${escapeHtml(latest!.semester)} ${latest!.year})</h2>
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Benchmark Group</th>
        <th>Unit</th>
        <th>Benchmark</th>
        <th>Difference</th>
      </tr>
    </thead>
    <tbody>
      ${benchmarks.map((b) => `
      <tr>
        <td>${escapeHtml(b.question_short)}</td>
        <td>${escapeHtml(b.group_type)}: ${escapeHtml(b.group_description)}</td>
        <td>${fmtPct(b.unit_score)}</td>
        <td>${fmtPct(b.benchmark_score)}</td>
        <td class="${b.difference >= 0 ? 'above' : 'below'}">${b.difference >= 0 ? '+' : ''}${b.difference.toFixed(1)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <h2>Student Feedback</h2>
  ${comments.length > 0 ? `
  <div class="sentiment-grid">
    <div class="sentiment-card sentiment-positive">
      <div class="sentiment-value">${sentimentCounts.positive}</div>
      <div>Positive</div>
    </div>
    <div class="sentiment-card sentiment-neutral">
      <div class="sentiment-value">${sentimentCounts.neutral}</div>
      <div>Neutral</div>
    </div>
    <div class="sentiment-card sentiment-negative">
      <div class="sentiment-value">${sentimentCounts.negative}</div>
      <div>Negative</div>
    </div>
  </div>

  ${topPositive.length > 0 ? `
  <h3>Most Positive Comments</h3>
  ${commentBlock(topPositive)}` : ''}

  ${topNegative.length > 0 ? `
  <h3>Most Critical Comments</h3>
  ${commentBlock(topNegative)}` : ''}` : `<p class="empty">No comments recorded for this unit.</p>`}

  <footer>
    <p>Generated by InsightLens on ${generatedDate.toLocaleDateString()} from imported unit survey reports.</p>
  </footer>
</body>
</html>
  `;
}
