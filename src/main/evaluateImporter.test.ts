// Tests for persistEvaluateSurvey — eValuate's parallel to persistSurvey.
//
// Pattern mirrors importer.test.ts: build an in-memory SQLite via the
// production createSchema(), feed in a sample EvaluateSurveyData, assert
// the resulting rows. node:sqlite is used so these run under plain
// vitest (no Electron rebuild needed).

import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';
import { persistEvaluateSurvey, persistSurvey } from './importer';
import { EVALUATE_QUESTIONS } from './evaluateExtractor';
import type { EvaluateSurveyData } from './evaluateExtractor';

function makeDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createSchema(db);
  return db;
}

function sampleEvaluate(overrides: Partial<EvaluateSurveyData> = {}): EvaluateSurveyData {
  return {
    format: 'evaluate',
    unit_info: {
      unit_code: 'ISYS6011',
      unit_name: 'Computer Forensics',
      unit_coordinator: 'Michael Borck',
      year: '2019',
      term: 'Semester 1',
      evaluation_period: '2019 Semester 1',
      aggregation: 'All results aggregated',
    },
    response_stats: { enrollments: 17, responses: 3, response_rate: 18 },
    questions: EVALUATE_QUESTIONS.map((q, i) => ({
      number: q.num,
      text: q.text,
      short: q.short,
      // Deterministic per-question values so we can assert specific cells.
      unit_agreement: 60 + i,
      faculty_agreement: 80 + i,
      university_agreement: 85 + i,
    })),
    qualitative: {
      most_helpful: ['Practical labs were excellent.', 'Clear explanations.'],
      improvements: ['Lab setup was rough early on.'],
    },
    notes: [],
    ...overrides,
  };
}

describe('persistEvaluateSurvey — schema seeding', () => {
  it('seeds the 11 eValuate question rows via createSchema()', () => {
    const db = makeDb();
    const evalQs = db
      .prepare(`SELECT question_short, question_text FROM question WHERE question_short LIKE 'eval_q%' ORDER BY question_short`)
      .all() as { question_short: string; question_text: string }[];
    // 11 questions, eval_q1..eval_q11, matching the canonical wording
    // from EVALUATE_QUESTIONS (which is also what's in schema.ts).
    expect(evalQs).toHaveLength(11);
    for (let i = 0; i < 11; i++) {
      // Default ORDER BY question_short on 'eval_q1'..'eval_q11' is
      // LEXICOGRAPHIC, so eval_q10 sorts between eval_q1 and eval_q2.
      // We don't rely on order — just that all 11 are present with the
      // right text.
    }
    const byShort = new Map(evalQs.map((q) => [q.question_short, q.question_text]));
    for (const q of EVALUATE_QUESTIONS) {
      expect(byShort.get(`eval_q${q.num}`)).toBe(q.text);
    }
  });

  it('Insight questions still present (existing seed not regressed)', () => {
    const db = makeDb();
    const insightShorts = ['engagement', 'resources', 'support', 'assessments', 'expectations', 'overall'];
    const count = db
      .prepare(`SELECT COUNT(*) as n FROM question WHERE question_short IN (?,?,?,?,?,?)`)
      .get(...insightShorts) as { n: number };
    expect(count.n).toBe(6);
  });
});

describe('persistEvaluateSurvey — end-to-end intake', () => {
  let db: any;
  beforeEach(() => {
    db = makeDb();
  });

  it('returns success + creates unit/offering/event/survey rows on first import', () => {
    const data = sampleEvaluate();
    const result = persistEvaluateSurvey(data, db, 'FUR_Report-ISYS6011-s1-2019.pdf');

    expect(result.status).toBe('success');
    expect(result.unit).toBe('ISYS6011');
    expect(result.period).toBe('Semester 1 2019');

    // unit + unit_offering
    const unit = db.prepare(`SELECT * FROM unit WHERE unit_code = ?`).get('ISYS6011') as any;
    expect(unit.unit_name).toBe('Computer Forensics');
    const offering = db
      .prepare(`SELECT * FROM unit_offering WHERE unit_code = ? AND year = ? AND semester = ?`)
      .get('ISYS6011', 2019, 'Semester 1') as any;
    expect(offering.location).toBe('All Campuses');
    expect(offering.mode).toBe('Internal');

    // survey_event uses the 'eValuate <term> <year>' prefix
    const events = db
      .prepare(`SELECT * FROM survey_event WHERE event_name LIKE 'eValuate %'`)
      .all() as any[];
    expect(events).toHaveLength(1);
    expect(events[0].event_name).toBe('eValuate Semester 1 2019');

    // unit_survey row carries the response stats + Q11 as overall_experience
    const survey = db.prepare(`SELECT * FROM unit_survey`).get() as any;
    expect(survey.enrolments).toBe(17);
    expect(survey.responses).toBe(3);
    expect(survey.response_rate).toBe(18);
    // Q11 maps to index 10 in our sample: unit_agreement = 60 + 10 = 70
    expect(survey.overall_experience).toBe(70);
    expect(survey.pdf_file_name).toBe('FUR_Report-ISYS6011-s1-2019.pdf');
  });

  it('writes 11 unit_survey_result rows (one per eValuate question)', () => {
    const data = sampleEvaluate();
    persistEvaluateSurvey(data, db, 'test.pdf');

    const surveyResults = db
      .prepare(
        `SELECT q.question_short, r.percent_agree
         FROM unit_survey_result r
         JOIN question q ON r.question_id = q.question_id
         WHERE q.question_short LIKE 'eval_q%'
         ORDER BY q.question_id`,
      )
      .all() as { question_short: string; percent_agree: number }[];
    expect(surveyResults).toHaveLength(11);
    // Spot-check Q1 = unit_agreement 60, Q11 = unit_agreement 70 (per sample)
    const byShort = new Map(surveyResults.map((r) => [r.question_short, r.percent_agree]));
    expect(byShort.get('eval_q1')).toBe(60);
    expect(byShort.get('eval_q11')).toBe(70);
  });

  it('writes 22 benchmark rows (11 Faculty + 11 University)', () => {
    const data = sampleEvaluate();
    persistEvaluateSurvey(data, db, 'test.pdf');

    const benchmarks = db
      .prepare(
        `SELECT group_type, COUNT(*) as n FROM benchmark GROUP BY group_type ORDER BY group_type`,
      )
      .all() as { group_type: string; n: number }[];
    expect(benchmarks).toEqual([
      { group_type: 'Faculty', n: 11 },
      { group_type: 'University', n: 11 },
    ]);

    // Spot-check Q1: faculty 80, university 85 (per sample)
    const q1Faculty = db
      .prepare(
        `SELECT b.percent_agree FROM benchmark b
         JOIN question q ON b.question_id = q.question_id
         WHERE q.question_short = 'eval_q1' AND b.group_type = 'Faculty'`,
      )
      .get() as { percent_agree: number };
    expect(q1Faculty.percent_agree).toBe(80);
  });

  it('writes comment rows with section prefix preserved', () => {
    const data = sampleEvaluate();
    persistEvaluateSurvey(data, db, 'test.pdf');

    const comments = db
      .prepare(`SELECT comment_text FROM comment ORDER BY comment_id`)
      .all() as { comment_text: string }[];
    expect(comments).toHaveLength(3); // 2 helpful + 1 improvement
    expect(comments[0].comment_text).toMatch(/^\[Most helpful\] /);
    expect(comments[2].comment_text).toMatch(/^\[Improvement\] /);
  });

  it('returns duplicate on second import of same offering', () => {
    const data = sampleEvaluate();
    persistEvaluateSurvey(data, db, 'test.pdf');
    const second = persistEvaluateSurvey(data, db, 'test.pdf');
    expect(second.status).toBe('duplicate');

    // And the DB still has only one survey row.
    const count = db.prepare(`SELECT COUNT(*) as n FROM unit_survey`).get() as { n: number };
    expect(count.n).toBe(1);
  });

  it('throws on missing required fields', () => {
    const broken = sampleEvaluate({ unit_info: { unit_name: 'no code' } });
    expect(() => persistEvaluateSurvey(broken, db, 'broken.pdf')).toThrow(/required/i);
  });

  it('coexists with an Insight survey for the same unit/term (different campus → not a duplicate)', () => {
    // Insight survey for ISYS6011 s1 2019 Bentley/Internal (persistSurvey
    // imported statically at top of file — dynamic require() doesn't work
    // in vitest's ESM context).
    const insightSample = {
      unit_info: {
        unit_code: 'ISYS6011',
        unit_name: 'Computer Forensics',
        campus_name: 'Bentley',
        mode: 'Internal',
        term: 'Semester 1',
        year: '2019',
      },
      response_stats: { enrollments: 50, responses: 20, response_rate: 40 },
      percentage_agreement: { engagement: 90, resources: 85, support: 80, assessments: 88, expectations: 92, overall: 87 },
      benchmarks: [],
      detailed_results: {},
      comments: [],
    };
    persistSurvey(insightSample, db, 'insight.pdf');

    // Now eValuate for the same unit/term but campus = 'All Campuses'
    const evalResult = persistEvaluateSurvey(sampleEvaluate(), db, 'evaluate.pdf');
    expect(evalResult.status).toBe('success');

    // Both surveys exist.
    const surveys = db
      .prepare(
        `SELECT se.event_name FROM unit_survey us
         JOIN survey_event se ON us.event_id = se.event_id
         ORDER BY us.survey_id`,
      )
      .all() as { event_name: string }[];
    expect(surveys).toHaveLength(2);
    // The event_name prefix distinguishes the two instruments
    expect(surveys.some((s) => s.event_name === 'eValuate Semester 1 2019')).toBe(true);
  });
});
