// CSV importer: persists survey data from a documented CSV format, for data
// that isn't available as PDF reports. Mirrors importer.ts conventions:
// the same Offering-identity duplicate check, the same atomic per-survey
// transaction, and the same PersistResult shape — so the surveys:import
// handler treats all three formats (Insight PDF, eValuate PDF, CSV) uniformly.
//
// CSV format (header row, case-insensitive column names; column order free):
//   Required: unit_code, unit_name, year, semester, location, mode,
//             enrolments, responses, overall_experience
//   Optional: response_rate  (computed from responses/enrolments when absent)
//             discipline     (defaults to 'GENERAL')
//             engagement, resources, support, assessments, expectations,
//             overall        (per-question percent-agree, 0–100; these match
//                             the Insight question_short values seeded in
//                             schema.ts)
// One data row = one survey. Rows are validated and persisted independently:
// a bad row reports its error but doesn't abort the rest of the file.
import type { DatabaseSync } from 'node:sqlite';
import { normalizeCampusName, type PersistResult } from './importer';

// ── RFC-4180 parser ─────────────────────────────────────────────────────
//
// Small, dependency-free CSV parser: quoted fields, embedded commas,
// escaped quotes ("") and embedded newlines inside quoted fields; accepts
// LF and CRLF line endings. Returns an array of records (rows of fields).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch; // includes embedded commas and newlines
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++; // CRLF
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the final record when the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Column spec ─────────────────────────────────────────────────────────

export const CSV_REQUIRED_COLUMNS = [
  'unit_code',
  'unit_name',
  'year',
  'semester',
  'location',
  'mode',
  'enrolments',
  'responses',
  'overall_experience',
] as const;

/** Per-question percent-agree columns — the Insight question_short values
 *  seeded in schema.ts createSchema(). */
export const CSV_QUESTION_COLUMNS = [
  'engagement',
  'resources',
  'support',
  'assessments',
  'expectations',
  'overall',
] as const;

// Must match the unit_offering.mode CHECK constraint in schema.ts.
const VALID_MODES = ['Internal', 'Online', 'Aggregated'];
// The semester vocabulary the rest of the app understands (see the calendar
// ordering CASE in queries/dashboard.ts getLatestPeriod).
const VALID_SEMESTERS = ['Semester 1', 'Semester 2', 'Trimester 1', 'Trimester 2', 'Trimester 3'];

export interface CsvSurveyRow {
  unit_code: string;
  unit_name: string;
  year: number;
  semester: string;
  location: string;
  mode: string;
  enrolments: number;
  responses: number;
  response_rate: number;
  overall_experience: number;
  discipline?: string;
  /** Only the question columns actually present (and non-empty) in the row. */
  questions: Partial<Record<(typeof CSV_QUESTION_COLUMNS)[number], number>>;
}

// ── Per-row validation ──────────────────────────────────────────────────

function matchCanonical(value: string, valid: string[], label: string): string {
  const hit = valid.find((v) => v.toLowerCase() === value.trim().toLowerCase());
  if (!hit) throw new Error(`Invalid ${label} "${value}" (expected one of: ${valid.join(', ')})`);
  return hit;
}

function parseNumber(value: string, label: string, opts: { min: number; max: number; integer?: boolean }): number {
  const n = Number(value.trim());
  if (!Number.isFinite(n)) throw new Error(`Invalid ${label} "${value}" (not a number)`);
  if (opts.integer && !Number.isInteger(n)) throw new Error(`Invalid ${label} "${value}" (must be a whole number)`);
  if (n < opts.min || n > opts.max) {
    throw new Error(`Invalid ${label} "${value}" (must be between ${opts.min} and ${opts.max})`);
  }
  return n;
}

/** Validate + normalize one data record into a CsvSurveyRow. Throws with a
 *  human-readable message on the first problem found. */
export function parseCsvRow(columnIndex: Map<string, number>, fields: string[]): CsvSurveyRow {
  const get = (col: string): string => {
    const idx = columnIndex.get(col);
    return idx === undefined ? '' : (fields[idx] ?? '').trim();
  };

  for (const col of CSV_REQUIRED_COLUMNS) {
    if (get(col) === '') throw new Error(`Missing value for required column "${col}"`);
  }

  const year = parseNumber(get('year'), 'year', { min: 1990, max: 2100, integer: true });
  const semester = matchCanonical(get('semester'), VALID_SEMESTERS, 'semester');
  const mode = matchCanonical(get('mode'), VALID_MODES, 'mode');
  const enrolments = parseNumber(get('enrolments'), 'enrolments', { min: 0, max: 1_000_000, integer: true });
  const responses = parseNumber(get('responses'), 'responses', { min: 0, max: 1_000_000, integer: true });
  const overallExperience = parseNumber(get('overall_experience'), 'overall_experience', { min: 0, max: 100 });

  // response_rate: taken from the file when present, otherwise computed.
  const rateRaw = get('response_rate');
  const responseRate =
    rateRaw !== ''
      ? parseNumber(rateRaw, 'response_rate', { min: 0, max: 100 })
      : enrolments > 0
        ? Math.round((responses / enrolments) * 1000) / 10
        : 0;

  const questions: CsvSurveyRow['questions'] = {};
  for (const q of CSV_QUESTION_COLUMNS) {
    const raw = get(q);
    if (raw !== '') questions[q] = parseNumber(raw, q, { min: 0, max: 100 });
  }

  return {
    unit_code: get('unit_code').toUpperCase(),
    unit_name: get('unit_name'),
    year,
    semester,
    location: normalizeCampusName(get('location')),
    mode,
    enrolments,
    responses,
    response_rate: responseRate,
    overall_experience: overallExperience,
    discipline: get('discipline') || undefined,
    questions,
  };
}

// ── Persistence ─────────────────────────────────────────────────────────

/**
 * Persist one validated CSV row as one survey. Same duplicate check as the
 * PDF importers (Offering identity: unit + year + semester + location + mode,
 * backed by the UNIQUE constraint on unit_offering) and the same atomic
 * BEGIN/COMMIT/ROLLBACK pattern as importer.ts.
 */
export function persistCsvRow(row: CsvSurveyRow, db: DatabaseSync, sourceLabel: string): PersistResult {
  const period = `${row.semester} ${row.year}`;

  const existing = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       WHERE uo.unit_code = ? AND uo.year = ? AND uo.semester = ? AND uo.location = ? AND uo.mode = ?`,
    )
    .get(row.unit_code, row.year, row.semester, row.location, row.mode) as { count: number };

  if (existing.count > 0) {
    return { status: 'duplicate', unit: row.unit_code, period };
  }

  db.exec('BEGIN');
  try {
    // Discipline: the optional column value doubles as code + name (the CSV
    // format doesn't separate them); absent → the same GENERAL fallback the
    // PDF importers use.
    const disciplineCode = row.discipline ?? 'GENERAL';
    const disciplineName = row.discipline ?? 'General Studies';
    db.prepare(`INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)`).run(
      disciplineCode,
      disciplineName,
    );

    db.prepare(
      `INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code, academic_level) VALUES (?, ?, ?, ?)`,
    ).run(row.unit_code, row.unit_name, disciplineCode, 'UG');

    const offeringResult = db
      .prepare(`INSERT OR IGNORE INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`)
      .run(row.unit_code, row.year, row.semester, row.location, row.mode);
    // INSERT OR IGNORE returns lastInsertRowid=0 when the offering already
    // existed (possible when it has no survey yet) — look it up by UNIQUE key.
    let unitOfferingId: number | bigint = offeringResult.lastInsertRowid;
    if (!unitOfferingId) {
      const existingOffering = db
        .prepare(
          `SELECT unit_offering_id FROM unit_offering
           WHERE unit_code = ? AND year = ? AND semester = ? AND location = ? AND mode = ?`,
        )
        .get(row.unit_code, row.year, row.semester, row.location, row.mode) as { unit_offering_id: number };
      unitOfferingId = existingOffering.unit_offering_id;
    }

    const eventResult = db
      .prepare(`INSERT INTO survey_event (event_name, institution) VALUES (?, ?)`)
      .run(period, 'Curtin University');
    const eventId = eventResult.lastInsertRowid;

    const surveyResult = db
      .prepare(
        `INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience, pdf_file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        unitOfferingId,
        eventId,
        row.enrolments,
        row.responses,
        row.response_rate,
        row.overall_experience,
        sourceLabel,
      );
    const surveyId = surveyResult.lastInsertRowid;

    // Per-question results for the columns present in the row. When the
    // 'overall' column is absent, fall back to overall_experience so the
    // unit's "Overall satisfaction" timeline still gets a point for this
    // survey (the two are the same measure in the Insight instrument).
    const resultValues: Record<string, number> = {};
    for (const [short, value] of Object.entries(row.questions)) {
      if (value !== undefined) resultValues[short] = value;
    }
    if (resultValues.overall === undefined) resultValues.overall = row.overall_experience;

    const questionRows = db
      .prepare(`SELECT question_id, question_short FROM question WHERE question_short IN (${CSV_QUESTION_COLUMNS.map(() => '?').join(',')})`)
      .all(...CSV_QUESTION_COLUMNS) as { question_id: number; question_short: string }[];
    const questionIdByShort = new Map(questionRows.map((q) => [q.question_short, q.question_id]));

    for (const [short, percentAgree] of Object.entries(resultValues)) {
      const questionId = questionIdByShort.get(short);
      if (questionId === undefined) continue;
      db.prepare(`INSERT INTO unit_survey_result (survey_id, question_id, percent_agree) VALUES (?, ?, ?)`).run(
        surveyId,
        questionId,
        percentAgree,
      );
    }

    db.exec('COMMIT');
    return { status: 'success', unit: row.unit_code, period, surveyId: Number(surveyId) };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ── File-level orchestration ────────────────────────────────────────────

export interface CsvRowOutcome {
  /** 1-based record number in the file (header = row 1, first data row = 2). */
  row: number;
  status: 'success' | 'duplicate' | 'failed';
  unit?: string;
  period?: string;
  surveyId?: number;
  error?: string;
}

/**
 * Import a whole CSV file. Returns one outcome per data row (success /
 * duplicate / failed); a bad row never aborts the rest of the file. A
 * file-level problem (empty file, missing required header columns) returns
 * a single failed outcome for row 1.
 */
export function importCsv(text: string, db: DatabaseSync, fileName: string): CsvRowOutcome[] {
  const records = parseCsv(text);
  if (records.length === 0) {
    return [{ row: 1, status: 'failed', error: 'Empty CSV file' }];
  }

  const header = records[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return [{ row: 1, status: 'failed', error: `Missing required column(s): ${missing.join(', ')}` }];
  }
  const columnIndex = new Map(header.map((h, i) => [h, i] as const));

  const outcomes: CsvRowOutcome[] = [];
  for (let i = 1; i < records.length; i++) {
    const rowNum = i + 1;
    const fields = records[i];
    if (fields.every((f) => f.trim() === '')) continue; // skip blank lines

    try {
      const parsed = parseCsvRow(columnIndex, fields);
      const result = persistCsvRow(parsed, db, `${fileName} (row ${rowNum})`);
      outcomes.push({
        row: rowNum,
        status: result.status,
        unit: result.unit,
        period: result.period,
        surveyId: result.surveyId,
      });
    } catch (err) {
      outcomes.push({ row: rowNum, status: 'failed', error: (err as Error).message });
    }
  }

  if (outcomes.length === 0) {
    return [{ row: 1, status: 'failed', error: 'No data rows found in CSV file' }];
  }
  return outcomes;
}
