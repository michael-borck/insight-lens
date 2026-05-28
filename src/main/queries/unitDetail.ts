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

/**
 * Delete a unit and every record that references it. Cascading is done in
 * SQL (the schema doesn't yet declare ON DELETE CASCADE — adding that
 * would require rebuilding 5 tables; doing it here is simpler and easier
 * to reason about).
 *
 * Order matters because foreign_keys = ON is enabled at connection time:
 * a child row must go before its parent. Wrapped in a transaction so a
 * mid-delete failure doesn't leave a partially-gutted unit.
 *
 * Shared rows (question, survey_event) are NOT touched — they may be
 * referenced by other units' surveys.
 *
 * Returns counts of what was actually removed so the UI can confirm
 * "Deleted N surveys, M comments" to the user.
 */
export function deleteUnit(db: DB, params: { unitCode: string }) {
  const { unitCode } = params;

  // Snapshot counts before delete so we can return them.
  const surveyIds = (
    db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = ?`,
      )
      .all(unitCode) as { survey_id: number }[]
  ).map((r) => r.survey_id);

  if (surveyIds.length === 0) {
    // Unit exists but has no surveys (or unit doesn't exist at all).
    // Still try to delete the unit row — harmless if it doesn't exist.
    const offered = db.prepare(`DELETE FROM unit_offering WHERE unit_code = ?`).run(unitCode);
    const removed = db.prepare(`DELETE FROM unit WHERE unit_code = ?`).run(unitCode);
    return {
      unit_code: unitCode,
      surveys_deleted: 0,
      comments_deleted: 0,
      offerings_deleted: Number(offered.changes ?? 0),
      unit_removed: Number(removed.changes ?? 0) > 0,
    };
  }

  // Build the IN-list placeholders for the survey_id batch deletes.
  const surveyPlaceholders = surveyIds.map(() => '?').join(',');

  db.exec('BEGIN');
  try {
    const commentsResult = db
      .prepare(`DELETE FROM comment WHERE survey_id IN (${surveyPlaceholders})`)
      .run(...surveyIds);
    db.prepare(`DELETE FROM benchmark WHERE survey_id IN (${surveyPlaceholders})`).run(...surveyIds);
    db.prepare(
      `DELETE FROM unit_survey_result WHERE survey_id IN (${surveyPlaceholders})`,
    ).run(...surveyIds);
    db.prepare(`DELETE FROM unit_survey WHERE survey_id IN (${surveyPlaceholders})`).run(
      ...surveyIds,
    );
    const offeringsResult = db
      .prepare(`DELETE FROM unit_offering WHERE unit_code = ?`)
      .run(unitCode);
    const unitResult = db.prepare(`DELETE FROM unit WHERE unit_code = ?`).run(unitCode);
    db.exec('COMMIT');

    return {
      unit_code: unitCode,
      surveys_deleted: surveyIds.length,
      comments_deleted: Number(commentsResult.changes ?? 0),
      offerings_deleted: Number(offeringsResult.changes ?? 0),
      unit_removed: Number(unitResult.changes ?? 0) > 0,
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Delete a single survey and its dependents (comments, benchmarks,
 * per-question results). If the survey's offering has no other surveys
 * after the delete, the offering is removed too; if the unit then has
 * no other offerings, the unit row goes as well.
 *
 * This "tidy as you go" cleanup keeps the dashboard from showing units
 * with zero data after a granular delete — but it never deletes data
 * from other surveys for the same unit. Wrapped in a transaction.
 *
 * Returns the same shape as deleteUnit so the UI can render a uniform
 * success toast either way.
 */
export function deleteSurvey(db: DB, params: { surveyId: number }) {
  const { surveyId } = params;

  // Look up the parent offering + unit so we can check for orphans after.
  const parent = db
    .prepare(
      `SELECT uo.unit_offering_id, uo.unit_code
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE us.survey_id = ?`,
    )
    .get(surveyId) as { unit_offering_id: number; unit_code: string } | undefined;

  if (!parent) {
    // Already deleted or never existed — return a no-op result.
    return {
      survey_id: surveyId,
      unit_code: null as string | null,
      comments_deleted: 0,
      offering_removed: false,
      unit_removed: false,
    };
  }

  db.exec('BEGIN');
  try {
    const commentsResult = db.prepare(`DELETE FROM comment WHERE survey_id = ?`).run(surveyId);
    db.prepare(`DELETE FROM benchmark WHERE survey_id = ?`).run(surveyId);
    db.prepare(`DELETE FROM unit_survey_result WHERE survey_id = ?`).run(surveyId);
    db.prepare(`DELETE FROM unit_survey WHERE survey_id = ?`).run(surveyId);

    // Orphan cleanup #1: if the offering has no remaining surveys, remove it.
    const otherSurveys = db
      .prepare(`SELECT 1 FROM unit_survey WHERE unit_offering_id = ? LIMIT 1`)
      .get(parent.unit_offering_id);
    let offeringRemoved = false;
    if (!otherSurveys) {
      const r = db
        .prepare(`DELETE FROM unit_offering WHERE unit_offering_id = ?`)
        .run(parent.unit_offering_id);
      offeringRemoved = Number(r.changes ?? 0) > 0;
    }

    // Orphan cleanup #2: if the unit has no remaining offerings, remove it.
    let unitRemoved = false;
    if (offeringRemoved) {
      const otherOfferings = db
        .prepare(`SELECT 1 FROM unit_offering WHERE unit_code = ? LIMIT 1`)
        .get(parent.unit_code);
      if (!otherOfferings) {
        const r = db.prepare(`DELETE FROM unit WHERE unit_code = ?`).run(parent.unit_code);
        unitRemoved = Number(r.changes ?? 0) > 0;
      }
    }

    db.exec('COMMIT');
    return {
      survey_id: surveyId,
      unit_code: parent.unit_code,
      comments_deleted: Number(commentsResult.changes ?? 0),
      offering_removed: offeringRemoved,
      unit_removed: unitRemoved,
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
