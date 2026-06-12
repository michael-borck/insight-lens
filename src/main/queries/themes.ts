// Comment Themes queries: pull comments through survey → offering → unit,
// classify them with the keyword taxonomy (src/main/themes.ts), and aggregate
// per theme for the Themes page. Classification happens in JS — the taxonomy
// is not SQL-expressible — but no SQL crosses IPC. ADR-0001.
import type { DatabaseSync } from 'node:sqlite';
import { THEMES, classifyComment } from '../themes';

type DB = DatabaseSync;

export interface ThemeFilters {
  year?: number | string;
  discipline?: string; // discipline_code
}

interface CommentRow {
  comment_text: string;
  sentiment_score: number | null;
  sentiment_label: string | null;
  unit_code: string;
  year: number;
  semester: string;
}

function fetchComments(db: DB, filters: ThemeFilters): CommentRow[] {
  const conditions: string[] = [];
  const args: any[] = [];
  if (filters.year) {
    conditions.push('uo.year = ?');
    args.push(typeof filters.year === 'string' ? parseInt(filters.year) : filters.year);
  }
  if (filters.discipline) {
    conditions.push('u.discipline_code = ?');
    args.push(filters.discipline);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return db
    .prepare(
      `SELECT c.comment_text, c.sentiment_score, c.sentiment_label,
              u.unit_code, uo.year, uo.semester
       FROM comment c
       JOIN unit_survey us ON c.survey_id = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN unit u ON uo.unit_code = u.unit_code
       ${where}`,
    )
    .all(...args) as unknown as CommentRow[];
}

export interface ThemeOverviewRow {
  key: string;
  name: string;
  icon: string;
  commentCount: number;
  /** Mean sentiment_score over classified comments that have one; null when none do. */
  avgSentiment: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  /** Per-year comment counts for a mini trend, ascending by year. */
  yearly: { year: number; count: number }[];
}

/**
 * Aggregate all comments (optionally filtered by year/discipline) into themes.
 * Themes with zero comments are omitted; result is sorted by commentCount desc.
 */
export function getThemeOverview(db: DB, params: ThemeFilters = {}) {
  const rows = fetchComments(db, params);

  const agg = new Map(
    THEMES.map((t) => [
      t.key,
      {
        commentCount: 0,
        sentimentSum: 0,
        sentimentN: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        yearly: new Map<number, number>(),
      },
    ]),
  );

  let classified = 0;
  for (const row of rows) {
    const matched = classifyComment(row.comment_text);
    if (matched.length > 0) classified++;
    for (const key of matched) {
      const a = agg.get(key)!;
      a.commentCount++;
      if (row.sentiment_score !== null && row.sentiment_score !== undefined) {
        a.sentimentSum += row.sentiment_score;
        a.sentimentN++;
      }
      if (row.sentiment_label === 'positive') a.positiveCount++;
      else if (row.sentiment_label === 'negative') a.negativeCount++;
      else a.neutralCount++;
      a.yearly.set(row.year, (a.yearly.get(row.year) ?? 0) + 1);
    }
  }

  const themes: ThemeOverviewRow[] = THEMES.map((t) => {
    const a = agg.get(t.key)!;
    return {
      key: t.key,
      name: t.name,
      icon: t.icon,
      commentCount: a.commentCount,
      avgSentiment: a.sentimentN > 0 ? a.sentimentSum / a.sentimentN : null,
      positiveCount: a.positiveCount,
      neutralCount: a.neutralCount,
      negativeCount: a.negativeCount,
      yearly: [...a.yearly.entries()]
        .map(([year, count]) => ({ year, count }))
        .sort((x, y) => x.year - y.year),
    };
  })
    .filter((t) => t.commentCount > 0)
    .sort((x, y) => y.commentCount - x.commentCount);

  return {
    themes,
    totals: {
      totalComments: rows.length,
      classifiedComments: classified,
      unclassifiedComments: rows.length - classified,
    },
  };
}

/**
 * Example comments for one theme, most-negative first then most-positive
 * (sentiment_score ascending; comments without a score sort as neutral),
 * so the actionable ones surface. Capped at `limit` (default 50).
 */
export function getThemeComments(
  db: DB,
  params: ThemeFilters & { theme: string; limit?: number },
) {
  const limit = params.limit ?? 50;
  const rows = fetchComments(db, params);
  return rows
    .filter((row) => classifyComment(row.comment_text).includes(params.theme))
    .sort((a, b) => (a.sentiment_score ?? 0) - (b.sentiment_score ?? 0))
    .slice(0, limit)
    .map(({ comment_text, sentiment_label, sentiment_score, unit_code, year, semester }) => ({
      comment_text,
      sentiment_label,
      sentiment_score,
      unit_code,
      year,
      semester,
    }));
}
