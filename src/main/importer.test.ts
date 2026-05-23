import { describe, it, expect } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';
import { persistSurvey, normalizeCampusName } from './importer';
import type { SurveyData } from './pdfExtractor';

// node:sqlite is ABI-independent, so it loads under plain-node vitest (better-sqlite3 is built for
// Electron). persistSurvey only needs prepare/run/get/all/exec, which both drivers provide.
function makeDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createSchema(db);
  return db;
}

function sample(unit: Partial<SurveyData['unit_info']> = {}, rest: Partial<SurveyData> = {}): SurveyData {
  return {
    unit_info: {
      unit_code: 'ISYS2001',
      unit_name: 'Intro to IS',
      campus_name: 'Bentley Campus',
      mode: 'Internal',
      term: 'Semester 1',
      year: '2025',
      ...unit,
    },
    response_stats: { enrollments: 100, responses: 50, response_rate: 50 },
    percentage_agreement: { engagement: 80, resources: 75, support: 70, assessments: 85, expectations: 90, overall: 82 },
    benchmarks: [],
    detailed_results: {},
    comments: ['Great unit', 'Too much work'],
    ...rest,
  };
}

describe('normalizeCampusName', () => {
  it('folds Bentley variations to "Bentley"', () => {
    expect(normalizeCampusName('  Bentley Perth ')).toBe('Bentley');
    expect(normalizeCampusName('BENTLEY')).toBe('Bentley');
  });
  it('trims but otherwise preserves other campuses', () => {
    expect(normalizeCampusName(' Sydney ')).toBe('Sydney');
  });
});

describe('persistSurvey', () => {
  it('persists a survey across all tables and reports success', () => {
    const db = makeDb();
    const result = persistSurvey(sample(), db as any, 'report.pdf');

    expect(result).toEqual({ status: 'success', unit: 'ISYS2001', period: 'Semester 1 2025' });

    const survey = db.prepare('SELECT * FROM unit_survey').get();
    expect(survey.overall_experience).toBe(82);
    expect(survey.pdf_file_name).toBe('report.pdf');
    expect(survey.enrolments).toBe(100);

    // 6 standard questions all have an agreement in the sample.
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey_result').get().c).toBe(6);
    expect(db.prepare('SELECT COUNT(*) AS c FROM comment').get().c).toBe(2);
  });

  it('normalizes the campus into the offering (in one place)', () => {
    const db = makeDb();
    persistSurvey(sample(), db as any, 'report.pdf');
    const offering = db.prepare('SELECT location FROM unit_offering').get();
    expect(offering.location).toBe('Bentley');
  });

  it('maps each question_short to its agreement', () => {
    const db = makeDb();
    persistSurvey(sample(), db as any, 'report.pdf');
    const row = db
      .prepare(
        `SELECT usr.percent_agree AS pa FROM unit_survey_result usr
         JOIN question q ON usr.question_id = q.question_id WHERE q.question_short = 'engagement'`,
      )
      .get();
    expect(row.pa).toBe(80);
  });

  it('returns "duplicate" for the same Offering identity and writes no second survey', () => {
    const db = makeDb();
    persistSurvey(sample(), db as any, 'a.pdf');
    const second = persistSurvey(sample(), db as any, 'b.pdf');

    expect(second.status).toBe('duplicate');
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey').get().c).toBe(1);
  });

  it('treats a different campus as a distinct offering, not a duplicate', () => {
    const db = makeDb();
    persistSurvey(sample(), db as any, 'a.pdf');
    const other = persistSurvey(sample({ campus_name: 'Sydney' }), db as any, 'b.pdf');

    expect(other.status).toBe('success');
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey').get().c).toBe(2);
  });

  it('throws on missing required unit information', () => {
    const db = makeDb();
    expect(() => persistSurvey(sample({ unit_code: undefined }), db as any, 'a.pdf')).toThrow(/Missing required/);
  });

  it('inserts benchmark rows keyed by question', () => {
    const db = makeDb();
    persistSurvey(
      sample({}, { benchmarks: [{ Level: 'University', Engagement_PA: 70, engagement_N: 500 }] }),
      db as any,
      'a.pdf',
    );
    const bench = db.prepare(`SELECT * FROM benchmark WHERE group_type = 'University'`).all();
    expect(bench.length).toBe(1);
    expect(bench[0].percent_agree).toBe(70);
    expect(bench[0].response_count).toBe(500);
  });
});
