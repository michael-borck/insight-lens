// Dashboard queries. Each function owns its parameterized SQL. See ADR-0001.
import type Database from 'better-sqlite3';

type DB = Database.Database;

export interface Period {
  year: number;
  semester: string;
}

export function getDashboardSummary(db: DB) {
  return db
    .prepare(
      `SELECT
         COUNT(DISTINCT u.unit_code) as total_units,
         COUNT(DISTINCT us.survey_id) as total_surveys,
         AVG(us.response_rate) as avg_response_rate,
         COUNT(DISTINCT c.comment_id) as total_comments
       FROM unit u
       LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
       LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
       LEFT JOIN comment c ON us.survey_id = c.survey_id`,
    )
    .get();
}

export function getRecentSurveys(db: DB, params: { limit?: number } = {}) {
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, uo.year, uo.semester, us.responses, us.response_rate, us.overall_experience
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN unit u ON uo.unit_code = u.unit_code
       ORDER BY us.created_at DESC
       LIMIT ?`,
    )
    .all(params.limit ?? 10);
}

export function getExperienceTrend(db: DB, params: { limit?: number } = {}) {
  return db
    .prepare(
      `SELECT uo.year, uo.semester, AVG(us.overall_experience) as avg_experience
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       GROUP BY uo.year, uo.semester
       ORDER BY uo.year, uo.semester
       LIMIT ?`,
    )
    .all(params.limit ?? 8);
}

/** The most recent (year, semester), using the calendar ordering of semesters/trimesters. */
export function getLatestPeriod(db: DB) {
  return db
    .prepare(
      `SELECT uo.year, uo.semester
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       ORDER BY uo.year DESC,
         CASE uo.semester
           WHEN 'Semester 2' THEN 4
           WHEN 'Trimester 3' THEN 3
           WHEN 'Trimester 2' THEN 2
           WHEN 'Trimester 1' THEN 1
           WHEN 'Semester 1' THEN 1
           ELSE 0
         END DESC
       LIMIT 1`,
    )
    .get();
}

function periodClause(periods: Period[]): { clause: string; args: any[] } {
  const clause = periods.map(() => '(uo.year = ? AND uo.semester = ?)').join(' OR ');
  const args: any[] = [];
  for (const p of periods) args.push(p.year, p.semester);
  return { clause, args };
}

/** Units at or above `minExperience` (default 85) within the given academic periods. */
export function getTopPerformers(db: DB, params: { periods: Period[]; minExperience?: number; limit?: number }) {
  const periods = params.periods ?? [];
  if (periods.length === 0) return [];
  const { clause, args } = periodClause(periods);
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, uo.year, uo.semester, us.overall_experience, us.response_rate, d.discipline_name
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN unit u ON uo.unit_code = u.unit_code
       JOIN discipline d ON u.discipline_code = d.discipline_code
       WHERE (${clause}) AND us.overall_experience >= ?
       ORDER BY us.overall_experience DESC, uo.year DESC, uo.semester DESC
       LIMIT ?`,
    )
    .all(...args, params.minExperience ?? 85, params.limit ?? 15);
}

/** Units below `maxExperience` (default 70) within the given academic periods. */
export function getNeedsAttentionByPeriod(db: DB, params: { periods: Period[]; maxExperience?: number; limit?: number }) {
  const periods = params.periods ?? [];
  if (periods.length === 0) return [];
  const { clause, args } = periodClause(periods);
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, uo.year, uo.semester, us.overall_experience, us.response_rate, d.discipline_name
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN unit u ON uo.unit_code = u.unit_code
       JOIN discipline d ON u.discipline_code = d.discipline_code
       WHERE (${clause}) AND us.overall_experience < ?
       ORDER BY us.overall_experience ASC, uo.year DESC, uo.semester DESC
       LIMIT ?`,
    )
    .all(...args, params.maxExperience ?? 70, params.limit ?? 15);
}
