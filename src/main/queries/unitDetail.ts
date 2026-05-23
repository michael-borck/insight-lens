// Unit-detail queries (a single unit's record lists). See ADR-0001.
import type Database from 'better-sqlite3';

type DB = Database.Database;

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
