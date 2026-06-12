// Post-import comparison: the just-imported survey vs the unit's chronologically
// previous survey (any offering). Used by the surveys:import handler to surface
// "notable change" alerts in the Import results UI. Not in the query registry —
// it's main-process-internal, called with a survey_id the renderer never sees.
import type { DatabaseSync } from 'node:sqlite';

type DB = DatabaseSync;

// Calendar ordering of semesters/trimesters within a year — the same CASE
// used by dashboard.getLatestPeriod so "previous" matches the rest of the app.
const SEMESTER_RANK_SQL = `CASE uo.semester
  WHEN 'Semester 2' THEN 4
  WHEN 'Trimester 3' THEN 3
  WHEN 'Trimester 2' THEN 2
  WHEN 'Trimester 1' THEN 1
  WHEN 'Semester 1' THEN 1
  ELSE 0
END`;

interface ComparisonPoint {
  year: number;
  semester: string;
  overall_experience: number;
  response_rate: number;
}

export interface SurveyComparison {
  unit_code: string;
  current: ComparisonPoint;
  previous: ComparisonPoint;
}

/**
 * Find the imported survey's unit and the most recent strictly-earlier survey
 * for the same unit (any offering — campus/mode don't have to match), ordered
 * by year then calendar semester rank. Returns null when the survey doesn't
 * exist or there is no prior survey (first-ever import for the unit).
 *
 * Surveys in the SAME period (e.g. a different campus the same semester) are
 * not "previous" — only strictly earlier periods qualify. Ties within a
 * period (multiple offerings) break on survey_id DESC (latest import wins).
 */
export function getPreviousSurveyComparison(db: DB, surveyId: number): SurveyComparison | null {
  const current = db
    .prepare(
      `SELECT uo.unit_code, uo.year, uo.semester,
              us.overall_experience, us.response_rate,
              ${SEMESTER_RANK_SQL} AS sem_rank
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE us.survey_id = ?`,
    )
    .get(surveyId) as
    | (ComparisonPoint & { unit_code: string; sem_rank: number })
    | undefined;

  if (!current) return null;

  const previous = db
    .prepare(
      `SELECT uo.year, uo.semester, us.overall_experience, us.response_rate
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ?
         AND us.survey_id != ?
         AND (uo.year < ? OR (uo.year = ? AND ${SEMESTER_RANK_SQL} < ?))
       ORDER BY uo.year DESC, ${SEMESTER_RANK_SQL} DESC, us.survey_id DESC
       LIMIT 1`,
    )
    .get(current.unit_code, surveyId, current.year, current.year, current.sem_rank) as
    | ComparisonPoint
    | undefined;

  if (!previous) return null;

  return {
    unit_code: current.unit_code,
    current: {
      year: current.year,
      semester: current.semester,
      overall_experience: current.overall_experience,
      response_rate: current.response_rate,
    },
    previous,
  };
}
