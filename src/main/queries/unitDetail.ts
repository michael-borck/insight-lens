// Unit-detail queries (a single unit's record lists). See ADR-0001.
import type { DatabaseSync } from 'node:sqlite';

type DB = DatabaseSync;

export function getUnit(db: DB, params: { unitCode: string }) {
  return db
    .prepare(
      `SELECT u.*, d.discipline_name
       FROM unit u
       JOIN discipline d ON u.discipline_code = d.discipline_code
       WHERE u.unit_code = ?`,
    )
    .get(params.unitCode);
}

export function getUnitSurveyHistory(db: DB, params: { unitCode: string }) {
  return db
    .prepare(
      `SELECT us.*, uo.year, uo.semester, uo.location, uo.mode
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
       ORDER BY uo.year DESC, uo.semester DESC`,
    )
    .all(params.unitCode);
}

export function getUnitLatestQuestions(db: DB, params: { unitCode: string; limit?: number }) {
  return db
    .prepare(
      `SELECT q.question_short, usr.percent_agree
       FROM unit_survey_result usr
       JOIN question q ON usr.question_id = q.question_id
       JOIN unit_survey us ON usr.survey_id = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
       ORDER BY us.created_at DESC
       LIMIT ?`,
    )
    .all(params.unitCode, params.limit ?? 6);
}

export function getUnitComments(db: DB, params: { unitCode: string; limit?: number }) {
  return db
    .prepare(
      `SELECT c.*, uo.year, uo.semester
       FROM comment c
       JOIN unit_survey us ON c.survey_id = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
       ORDER BY c.created_at DESC
       LIMIT ?`,
    )
    .all(params.unitCode, params.limit ?? 50);
}

/**
 * One row per (survey × question) match for the requested question_short(s),
 * across this unit's entire history. Returned in chronological order so the
 * chart can plot it without re-sorting.
 *
 * The questionShorts array enables the "Overall satisfaction" virtual entry
 * — passing ['overall', 'eval_q11'] unions the Insight + eValuate equivalents
 * so the chart shows continuity across the instrument switch.
 *
 * Returns [] for an empty questionShorts array (cheap guard; SQLite IN ()
 * would otherwise be a syntax error).
 */
export function getUnitTimelineSeries(
  db: DB,
  params: { unitCode: string; questionShorts: string[] },
) {
  if (params.questionShorts.length === 0) return [];
  const placeholders = params.questionShorts.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT
         uo.year           AS year,
         uo.semester       AS semester,
         uo.location       AS location,
         uo.mode           AS mode,
         q.question_short  AS question_short,
         usr.percent_agree AS percent_agree,
         us.responses      AS responses,
         us.enrolments     AS enrolments,
         us.pdf_file_name  AS pdf_file_name,
         us.survey_id      AS survey_id
       FROM unit_survey_result usr
       JOIN question q       ON usr.question_id = q.question_id
       JOIN unit_survey us   ON usr.survey_id   = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
         AND q.question_short IN (${placeholders})
       ORDER BY uo.year ASC, uo.semester ASC`,
    )
    .all(params.unitCode, ...params.questionShorts);
}

/**
 * Distinct question_short values that have at least one result for this unit.
 * Drives the chart's question dropdown so users only see questions the unit
 * actually has data for. Includes the question_text so the dropdown can show
 * a human label.
 */
export function getUnitAvailableQuestions(db: DB, params: { unitCode: string }) {
  return db
    .prepare(
      `SELECT DISTINCT q.question_short, q.question_text
       FROM unit_survey_result usr
       JOIN question q       ON usr.question_id = q.question_id
       JOIN unit_survey us   ON usr.survey_id   = us.survey_id
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
       ORDER BY q.question_short`,
    )
    .all(params.unitCode);
}
