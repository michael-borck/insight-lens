// The Importer: persists ONE extracted survey into the database. Owns campus normalization,
// required-field validation, the duplicate check, and the atomic intake transaction. The Extractor
// (pdfExtractor) is the prior step; the per-batch loop and tally stay in the IPC handler.
// See CONTEXT.md: "Importer", "Offering identity".
import type Database from 'better-sqlite3';
import type { SurveyData } from './pdfExtractor';
import { analyzeSentimentSimple } from './sentiment';

export interface PersistResult {
  status: 'success' | 'duplicate';
  unit: string;
  period: string;
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
export function persistSurvey(data: SurveyData, db: Database.Database, pdfFileName: string): PersistResult {
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
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { status: 'success', unit: unitCode, period };
}
