// The Importer: persists ONE extracted survey into the database. Owns campus normalization,
// required-field validation, the duplicate check, and the atomic intake transaction. The Extractor
// (pdfExtractor) is the prior step; the per-batch loop and tally stay in the IPC handler.
// See CONTEXT.md: "Importer", "Offering identity".
import type { DatabaseSync } from 'node:sqlite';
import type { SurveyData } from './pdfExtractor';
import type { EvaluateSurveyData } from './evaluateExtractor';
import { analyzeSentimentSimple } from './sentiment';

export interface PersistResult {
  status: 'success' | 'duplicate';
  unit: string;
  period: string;
  /** survey_id of the newly inserted unit_survey row. Set on 'success' only —
   *  lets the import handler run post-import comparisons (change alerts). */
  surveyId?: number;
}

const REQUIRED_FIELDS: (keyof SurveyData['unit_info'])[] = [
  'unit_code',
  'unit_name',
  'year',
  'term',
  'campus_name',
  'mode',
];

/** Normalize campus name to fold known variations (kept in one place). */
export function normalizeCampusName(campusName: string): string {
  const normalized = campusName.trim();
  if (normalized.toLowerCase().includes('bentley')) return 'Bentley';
  return normalized;
}

/**
 * Persist a single extracted survey. Returns 'duplicate' when the Offering identity already exists;
 * throws on missing required fields or an insert failure (the handler maps that to a failed tally).
 */
export function persistSurvey(data: SurveyData, db: DatabaseSync, pdfFileName: string): PersistResult {
  const unitInfo = data.unit_info;

  for (const field of REQUIRED_FIELDS) {
    if (!unitInfo[field]) {
      throw new Error('Missing required unit information');
    }
  }

  const unitCode = unitInfo.unit_code!;
  const unitName = unitInfo.unit_name!;
  const year = parseInt(unitInfo.year!);
  const term = unitInfo.term!;
  const campus = normalizeCampusName(unitInfo.campus_name!);
  const mode = unitInfo.mode!;
  const period = `${term} ${year}`;

  // Duplicate check by Offering identity: unit + year + term + campus + mode.
  const existing = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ? AND uo.year = ? AND uo.semester = ? AND uo.location = ? AND uo.mode = ?`,
    )
    .get(unitCode, year, term, campus, mode) as { count: number };

  if (existing.count > 0) {
    return { status: 'duplicate', unit: unitCode, period };
  }

  db.exec('BEGIN');
  try {
    db.prepare(`INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)`).run(
      'GENERAL',
      'General Studies',
    );

    db.prepare(`INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code, academic_level) VALUES (?, ?, ?, ?)`).run(
      unitCode,
      unitName,
      'GENERAL',
      'UG',
    );

    const offeringResult = db
      .prepare(`INSERT OR IGNORE INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`)
      .run(unitCode, year, term, campus, mode);
    const unitOfferingId = offeringResult.lastInsertRowid;

    const eventResult = db
      .prepare(`INSERT OR IGNORE INTO survey_event (event_name, institution) VALUES (?, ?)`)
      .run(`${term} ${year}`, 'Curtin University');
    const eventId = eventResult.lastInsertRowid;

    const surveyResult = db
      .prepare(
        `INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience, pdf_file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        unitOfferingId,
        eventId,
        data.response_stats.enrollments || 0,
        data.response_stats.responses || 0,
        data.response_stats.response_rate || 0,
        data.percentage_agreement.overall || 0,
        pdfFileName,
      );
    const surveyId = surveyResult.lastInsertRowid;

    const questions = db.prepare('SELECT * FROM question').all() as any[];

    for (const question of questions) {
      const agreement = data.percentage_agreement[question.question_short as keyof typeof data.percentage_agreement];
      if (agreement !== undefined) {
        db.prepare(`INSERT INTO unit_survey_result (survey_id, question_id, percent_agree) VALUES (?, ?, ?)`).run(
          surveyId,
          question.question_id,
          agreement,
        );
      }
    }

    for (const benchmark of data.benchmarks) {
      for (const question of questions) {
        const paKey = `${question.question_short.charAt(0).toUpperCase() + question.question_short.slice(1)}_PA`;
        const percentAgree = benchmark[paKey];
        if (percentAgree !== undefined) {
          db.prepare(
            `INSERT INTO benchmark (survey_id, question_id, group_type, group_description, percent_agree, response_count)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(
            surveyId,
            question.question_id,
            benchmark.Level,
            benchmark.Level,
            percentAgree,
            benchmark[`${question.question_short}_N`] || 0,
          );
        }
      }
    }

    for (const comment of data.comments) {
      const sentiment = analyzeSentimentSimple(comment);
      db.prepare(`INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?)`).run(
        surveyId,
        comment,
        sentiment.score,
        sentiment.label,
      );
    }
    db.exec('COMMIT');
    return { status: 'success', unit: unitCode, period, surveyId: Number(surveyId) };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ── eValuate persistence ────────────────────────────────────────────────
//
// eValuate Full Unit Reports aggregate across campuses + modes
// ("Aggregation: All results aggregated") — they don't quote a single
// campus/mode the way Insight reports do. The schema requires both
// (`campus_name` NOT NULL, `mode TEXT CHECK(mode IN ('Internal',
// 'Online')) NOT NULL`), so we use placeholder values that are honest
// about the loss:
//   • campus = 'All Campuses'
//   • mode   = 'Internal'   (the dominant pre-pandemic delivery mode that
//                             eValuate-era teaching was; not strictly true
//                             for every report, but the schema's CHECK
//                             constraint forbids anything more honest
//                             without a schema migration we're not doing)
// These also serve as the duplicate-detection key, so the same eValuate
// report imported twice still gets caught.
//
// survey_event.event_name is prefixed with "eValuate " so a unit that has
// BOTH Insight and eValuate surveys for the same term/year keeps them
// distinguishable in queries (Insight uses `${term} ${year}`).
const EVALUATE_CAMPUS_PLACEHOLDER = 'All Campuses';
const EVALUATE_MODE_PLACEHOLDER = 'Aggregated';

const EVALUATE_REQUIRED_FIELDS: (keyof EvaluateSurveyData['unit_info'])[] = [
  'unit_code',
  'unit_name',
  'year',
  'term',
];

/**
 * Persist a single extracted eValuate survey. Mirrors persistSurvey's
 * shape (atomic transaction, duplicate detection, returns the same
 * PersistResult type) so the bulk-import handler treats both formats
 * uniformly.
 */
export function persistEvaluateSurvey(
  data: EvaluateSurveyData,
  db: DatabaseSync,
  pdfFileName: string,
): PersistResult {
  const unitInfo = data.unit_info;

  for (const field of EVALUATE_REQUIRED_FIELDS) {
    if (!unitInfo[field]) {
      throw new Error('Missing required eValuate unit information');
    }
  }

  const unitCode = unitInfo.unit_code!;
  const unitName = unitInfo.unit_name!;
  const year = parseInt(unitInfo.year!);
  const term = unitInfo.term!;
  const campus = EVALUATE_CAMPUS_PLACEHOLDER;
  const mode = EVALUATE_MODE_PLACEHOLDER;
  const period = `${term} ${year}`;

  // Duplicate check on the same Offering identity used by Insight.
  // Two eValuate imports of the same FUR_Report are caught; an Insight
  // + eValuate pair for the same unit/term is NOT a duplicate (different
  // campus values: 'Bentley' vs 'All Campuses').
  const existing = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN survey_event se ON us.event_id = se.event_id
       WHERE uo.unit_code = ? AND uo.year = ? AND uo.semester = ?
         AND uo.location = ? AND uo.mode = ?
         AND se.event_name LIKE 'eValuate %'`,
    )
    .get(unitCode, year, term, campus, mode) as { count: number };

  if (existing.count > 0) {
    return { status: 'duplicate', unit: unitCode, period };
  }

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)`,
    ).run('GENERAL', 'General Studies');

    db.prepare(
      `INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code, academic_level) VALUES (?, ?, ?, ?)`,
    ).run(unitCode, unitName, 'GENERAL', 'UG');

    const offeringResult = db
      .prepare(
        `INSERT OR IGNORE INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(unitCode, year, term, campus, mode);
    // INSERT OR IGNORE returns lastInsertRowid=0 if the row already
    // existed; look it up by the UNIQUE key in that case.
    let unitOfferingId: number | bigint = offeringResult.lastInsertRowid;
    if (!unitOfferingId) {
      const existingOffering = db
        .prepare(
          `SELECT unit_offering_id FROM unit_offering
           WHERE unit_code = ? AND year = ? AND semester = ? AND location = ? AND mode = ?`,
        )
        .get(unitCode, year, term, campus, mode) as { unit_offering_id: number };
      unitOfferingId = existingOffering.unit_offering_id;
    }

    const eventResult = db
      .prepare(`INSERT INTO survey_event (event_name, institution) VALUES (?, ?)`)
      .run(`eValuate ${term} ${year}`, 'Curtin University');
    const eventId = eventResult.lastInsertRowid;

    // Q11 ("Overall, I am satisfied with this unit.") maps closest to
    // Insight's 'overall' / unit_survey.overall_experience field.
    const overallQ = data.questions.find((q) => q.number === 11);
    const overallExperience = overallQ?.unit_agreement ?? 0;

    const surveyResult = db
      .prepare(
        `INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience, pdf_file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        unitOfferingId,
        eventId,
        data.response_stats.enrollments ?? 0,
        data.response_stats.responses ?? 0,
        data.response_stats.response_rate ?? 0,
        overallExperience,
        pdfFileName,
      );
    const surveyId = surveyResult.lastInsertRowid;

    // Look up the 11 eValuate question rows by their 'eval_qN' shorts
    // (seeded in schema.ts createSchema()). One round-trip; the table
    // is small and questions don't change between calls.
    const evalQuestions = db
      .prepare(
        `SELECT question_id, question_short FROM question
         WHERE question_short LIKE 'eval_q%'`,
      )
      .all() as { question_id: number; question_short: string }[];
    const questionIdByShort = new Map(
      evalQuestions.map((q) => [q.question_short, q.question_id]),
    );

    for (const q of data.questions) {
      const questionId = questionIdByShort.get(`eval_q${q.number}`);
      if (!questionId) continue;

      // eValuate's text layer only exposes the derived Unit-agreement %
      // (SA+A excluding UJ per Curtin formula). The SD/D/N/A/SA columns
      // stay 0 — they live in the chart bitmaps and aren't text-extractable.
      // Documented in EvaluateSurveyData.notes which is also surfaced
      // to the UI for transparency.
      if (q.unit_agreement !== undefined) {
        db.prepare(
          `INSERT INTO unit_survey_result (survey_id, question_id, percent_agree) VALUES (?, ?, ?)`,
        ).run(surveyId, questionId, q.unit_agreement);
      }

      // Faculty + University columns become benchmark rows — same shape
      // Insight uses for its 'School' / 'Faculty' / 'Curtin' comparisons.
      // response_count is 0 because eValuate doesn't quote per-question
      // response counts (only the overall Responses/Enrolment at the top).
      if (q.faculty_agreement !== undefined) {
        db.prepare(
          `INSERT INTO benchmark (survey_id, question_id, group_type, group_description, percent_agree, response_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(surveyId, questionId, 'Faculty', 'Faculty', q.faculty_agreement, 0);
      }
      if (q.university_agreement !== undefined) {
        db.prepare(
          `INSERT INTO benchmark (survey_id, question_id, group_type, group_description, percent_agree, response_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(surveyId, questionId, 'University', 'University', q.university_agreement, 0);
      }
    }

    // Comments — eValuate has two qualitative prompts ("most helpful
    // aspects" + "improvements"). Prefix the text so downstream queries
    // / UI can distinguish them; the underlying sentiment analysis still
    // sees the original wording (we run sentiment on the un-prefixed
    // text).
    for (const c of data.qualitative.most_helpful) {
      const sentiment = analyzeSentimentSimple(c);
      db.prepare(
        `INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?)`,
      ).run(surveyId, `[Most helpful] ${c}`, sentiment.score, sentiment.label);
    }
    for (const c of data.qualitative.improvements) {
      const sentiment = analyzeSentimentSimple(c);
      db.prepare(
        `INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?)`,
      ).run(surveyId, `[Improvement] ${c}`, sentiment.score, sentiment.label);
    }

    db.exec('COMMIT');
    return { status: 'success', unit: unitCode, period, surveyId: Number(surveyId) };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
