// Quick-insights queries: latest-survey-per-unit trends. These are the queries that didn't fit a
// generic spec (CTEs, correlated/MAX subqueries, CASE) — here they're just named functions. ADR-0001.
import type Database from 'better-sqlite3';

type DB = Database.Database;

/** Units whose latest survey improved more than 5 points over their previous survey. */
export function getTrendingUp(db: DB, params: { limit?: number } = {}) {
  return db
    .prepare(
      `WITH unit_trends AS (
         SELECT
           u.unit_code,
           u.unit_name,
           us1.overall_experience as latest_score,
           us2.overall_experience as previous_score,
           (us1.overall_experience - us2.overall_experience) as score_change,
           us1.response_rate as latest_response_rate,
           uo1.year as latest_year,
           uo1.semester as latest_semester
         FROM unit_survey us1
         JOIN unit_offering uo1 ON us1.unit_offering_id = uo1.unit_offering_id
         JOIN unit u ON uo1.unit_code = u.unit_code
         LEFT JOIN unit_survey us2 ON us2.survey_id = (
           SELECT us3.survey_id
           FROM unit_survey us3
           JOIN unit_offering uo3 ON us3.unit_offering_id = uo3.unit_offering_id
           WHERE uo3.unit_code = uo1.unit_code
             AND (uo3.year < uo1.year OR (uo3.year = uo1.year AND uo3.semester < uo1.semester))
           ORDER BY uo3.year DESC, uo3.semester DESC
           LIMIT 1
         )
         WHERE us2.overall_experience IS NOT NULL
       )
       SELECT * FROM unit_trends
       WHERE score_change > 5
       ORDER BY score_change DESC
       LIMIT ?`,
    )
    .all(params.limit ?? 10);
}

/** Units whose latest survey is below 70% experience or below 20% response rate. */
export function getNeedsAttention(db: DB, params: { limit?: number } = {}) {
  return db
    .prepare(
      `WITH unit_problems AS (
         SELECT
           u.unit_code,
           u.unit_name,
           us.overall_experience as latest_score,
           us.response_rate,
           uo.year,
           uo.semester,
           CASE
             WHEN us.overall_experience < 70 THEN 'Low Score'
             WHEN us.response_rate < 20 THEN 'Low Response Rate'
             ELSE 'Other'
           END as issue_type
         FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         JOIN unit u ON uo.unit_code = u.unit_code
         WHERE us.survey_id IN (
           SELECT MAX(us2.survey_id)
           FROM unit_survey us2
           JOIN unit_offering uo2 ON us2.unit_offering_id = uo2.unit_offering_id
           WHERE uo2.unit_code = uo.unit_code
           GROUP BY uo2.unit_code
         )
         AND (us.overall_experience < 70 OR us.response_rate < 20)
       )
       SELECT * FROM unit_problems
       ORDER BY latest_score ASC, response_rate ASC
       LIMIT ?`,
    )
    .all(params.limit ?? 10);
}

export function getSentimentTrend(db: DB, params: { limit?: number } = {}) {
  return db
    .prepare(
      `SELECT uo.year, uo.semester, AVG(c.sentiment_score) as avg_sentiment, COUNT(c.comment_id) as comment_count
       FROM comment c
       JOIN unit_survey us ON c.survey_id = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE c.sentiment_score IS NOT NULL
       GROUP BY uo.year, uo.semester
       ORDER BY uo.year, uo.semester
       LIMIT ?`,
    )
    .all(params.limit ?? 8);
}
