import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from '../schema';
import { persistSurvey, persistEvaluateSurvey } from '../importer';
import type { SurveyData } from '../pdfExtractor';
import { EVALUATE_QUESTIONS } from '../evaluateExtractor';
import type { EvaluateSurveyData } from '../evaluateExtractor';
import * as dashboard from './dashboard';
import * as units from './units';
import * as performance from './performance';
import * as unitDetail from './unitDetail';
import * as insights from './insights';
import { getPreviousSurveyComparison } from './comparison';

function makeDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createSchema(db);
  return db;
}

function survey(
  unit: Partial<SurveyData['unit_info']>,
  overall: number,
  comments: string[] = [],
): SurveyData {
  return {
    unit_info: { unit_code: 'ISYS2001', unit_name: 'Intro to IS', campus_name: 'Bentley', mode: 'Internal', term: 'Semester 1', year: '2024', ...unit },
    response_stats: { enrollments: 100, responses: 50, response_rate: 50 },
    percentage_agreement: { engagement: 80, resources: 75, support: 70, assessments: 85, expectations: 90, overall },
    benchmarks: [],
    detailed_results: {},
    comments,
  };
}

let db: any;
beforeEach(() => {
  db = makeDb();
  // ISYS2001: improves 60 -> 90 across two semesters (Bentley)
  persistSurvey(survey({ unit_code: 'ISYS2001', term: 'Semester 1' }, 60), db, 'a.pdf');
  persistSurvey(survey({ unit_code: 'ISYS2001', term: 'Semester 2' }, 90), db, 'b.pdf');
  // MKTG1000: a single strong survey (Sydney) with a positive comment
  persistSurvey(survey({ unit_code: 'MKTG1000', unit_name: 'Marketing', campus_name: 'Sydney', term: 'Semester 1' }, 88, ['Loved it']), db, 'c.pdf');
  // LAWS1000: a single weak survey (Bentley)
  persistSurvey(survey({ unit_code: 'LAWS1000', unit_name: 'Law', term: 'Semester 1' }, 55), db, 'd.pdf');
});

describe('dashboard queries', () => {
  it('summary counts units and surveys', () => {
    const s = dashboard.getDashboardSummary(db) as any;
    expect(s.total_units).toBe(3);
    expect(s.total_surveys).toBe(4);
  });

  it('topPerformers within a period returns >=85 only', () => {
    const rows = dashboard.getTopPerformers(db, { periods: [{ year: 2024, semester: 'Semester 1' }, { year: 2024, semester: 'Semester 2' }] }) as any[];
    const codes = rows.map((r) => `${r.unit_code}:${r.overall_experience}`);
    expect(codes).toContain('ISYS2001:90');
    expect(codes).toContain('MKTG1000:88');
    expect(rows.every((r) => r.overall_experience >= 85)).toBe(true);
  });
});

describe('performance queries', () => {
  it('star-performers honours the threshold', () => {
    const rows = performance.getPerformanceUnits(db, { reportType: 'star-performers', satisfactionThreshold: 85 }) as any[];
    expect(rows.every((r) => r.overall_experience >= 85)).toBe(true);
    expect(rows.length).toBe(2);
  });

  it('needs-attention returns sub-70 surveys', () => {
    const rows = performance.getPerformanceUnits(db, { reportType: 'needs-attention' }) as any[];
    expect(rows.map((r) => r.unit_code).sort()).toEqual(['ISYS2001', 'LAWS1000']);
  });

  it('filters by campus', () => {
    const rows = performance.getPerformanceUnits(db, { campus: 'Sydney' }) as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].unit_code).toBe('MKTG1000');
  });
});

describe('units queries', () => {
  it('summary rolls up campuses and averages per unit', () => {
    const rows = units.getUnitsSummary(db) as any[];
    const isys = rows.find((r) => r.unit_code === 'ISYS2001');
    expect(isys.survey_count).toBe(2);
    expect(isys.avg_experience).toBe(75);
    expect(isys.campuses).toBe('Bentley');
  });

  it('filter options expose distinct campuses', () => {
    const opts = units.getUnitFilterOptions(db);
    expect(opts.campuses.sort()).toEqual(['Bentley', 'Sydney']);
    expect(opts.years).toEqual([2024]);
  });
});

describe('unit-detail queries', () => {
  it('returns the unit with its discipline and full survey history', () => {
    expect((unitDetail.getUnit(db, { unitCode: 'ISYS2001' }) as any).discipline_name).toBe('General Studies');
    expect(unitDetail.getUnitSurveyHistory(db, { unitCode: 'ISYS2001' }) as any[]).toHaveLength(2);
  });

  it('returns a unit\'s comments', () => {
    expect(unitDetail.getUnitComments(db, { unitCode: 'MKTG1000' }) as any[]).toHaveLength(1);
  });
});

// Timeline queries — Phase 4 chart needs per-question history + a knowledge
// of which questions a unit actually has so the dropdown is meaningful.
describe('unit-timeline queries', () => {
  function evalSample(overrides: { unit_code?: string; year?: string; term?: string; q11?: number } = {}): EvaluateSurveyData {
    return {
      format: 'evaluate',
      unit_info: {
        unit_code: overrides.unit_code ?? 'ISYS6011',
        unit_name: 'Computer Forensics',
        unit_coordinator: 'Michael Borck',
        year: overrides.year ?? '2019',
        term: overrides.term ?? 'Semester 1',
        evaluation_period: `${overrides.year ?? '2019'} ${overrides.term ?? 'Semester 1'}`,
        aggregation: 'All results aggregated',
      },
      response_stats: { enrollments: 17, responses: 3, response_rate: 18 },
      questions: EVALUATE_QUESTIONS.map((q) => ({
        number: q.num,
        text: q.text,
        short: q.short,
        // Q11 (index 10) drives 'Overall satisfaction'; let the test override
        // it so we can assert specific values per row.
        unit_agreement: q.num === 11 ? (overrides.q11 ?? 70) : 50 + q.num,
        faculty_agreement: 80,
        university_agreement: 85,
      })),
      qualitative: { most_helpful: [], improvements: [] },
      notes: [],
    };
  }

  it('returns one row per (survey × matching question) for a single question_short', () => {
    // ISYS2001 has 2 Insight surveys with overall = 60 then 90.
    const rows = unitDetail.getUnitTimelineSeries(db, {
      unitCode: 'ISYS2001',
      questionShorts: ['overall'],
    }) as any[];
    expect(rows).toHaveLength(2);
    // Chronological order — S1 before S2 within the same year.
    expect(rows[0].semester).toBe('Semester 1');
    expect(rows[0].percent_agree).toBe(60);
    expect(rows[1].semester).toBe('Semester 2');
    expect(rows[1].percent_agree).toBe(90);
    // Mode is carried through for colour-encoding on the chart.
    expect(rows[0].mode).toBe('Internal');
  });

  it('unions Insight overall + eValuate eval_q11 for cross-instrument continuity', () => {
    // Add an eValuate survey for ISYS2001 in a different year so its row is
    // visible alongside the existing Insight rows.
    persistEvaluateSurvey(
      evalSample({ unit_code: 'ISYS2001', year: '2019', term: 'Semester 2', q11: 72 }),
      db,
      'fur.pdf',
    );

    const rows = unitDetail.getUnitTimelineSeries(db, {
      unitCode: 'ISYS2001',
      questionShorts: ['overall', 'eval_q11'],
    }) as any[];
    // 2 Insight (2024 S1, 2024 S2) + 1 eValuate (2019 S2) = 3 points.
    expect(rows).toHaveLength(3);
    // The 2019 eValuate row appears first (chronological).
    expect(rows[0].year).toBe(2019);
    expect(rows[0].question_short).toBe('eval_q11');
    expect(rows[0].percent_agree).toBe(72);
    // The 2024 Insight rows come after, ordered S1 → S2.
    expect(rows[1].year).toBe(2024);
    expect(rows[1].question_short).toBe('overall');
    expect(rows[2].question_short).toBe('overall');
    // The eValuate row carries the 'Aggregated' mode placeholder so the
    // chart can render it with the eValuate shape/colour.
    expect(rows[0].mode).toBe('Aggregated');
  });

  it('returns [] for an empty questionShorts array (no SQL syntax error)', () => {
    const rows = unitDetail.getUnitTimelineSeries(db, {
      unitCode: 'ISYS2001',
      questionShorts: [],
    }) as any[];
    expect(rows).toEqual([]);
  });

  it('available-questions lists only shorts the unit actually has data for', () => {
    // ISYS2001 only has Insight data → 6 Insight shorts, no eval_q* shorts.
    const shorts = (unitDetail.getUnitAvailableQuestions(db, { unitCode: 'ISYS2001' }) as any[])
      .map((r) => r.question_short)
      .sort();
    expect(shorts).toEqual(
      ['assessments', 'engagement', 'expectations', 'overall', 'resources', 'support'].sort(),
    );

    // Add an eValuate row and the list grows to include eval_q* shorts.
    persistEvaluateSurvey(evalSample({ unit_code: 'ISYS2001' }), db, 'fur.pdf');
    const afterEval = (
      unitDetail.getUnitAvailableQuestions(db, { unitCode: 'ISYS2001' }) as any[]
    ).map((r) => r.question_short);
    expect(afterEval).toContain('eval_q1');
    expect(afterEval).toContain('eval_q11');
    expect(afterEval).toContain('overall'); // Insight ones still present
  });

  it('returns the question_text so the dropdown can show a human label', () => {
    const rows = unitDetail.getUnitAvailableQuestions(db, { unitCode: 'ISYS2001' }) as any[];
    const overall = rows.find((r) => r.question_short === 'overall');
    expect(overall.question_text).toBe('Overall, this unit was a worthwhile experience');
  });
});

// Destructive operations. Both functions cascade through the relational
// schema (the FKs don't declare ON DELETE CASCADE — see comments in
// queries/unitDetail.ts). These tests guard the cascade order and the
// orphan-cleanup behaviour.
describe('deleteUnit / deleteSurvey', () => {
  it('deleteUnit removes the unit and every record that referenced it', () => {
    // ISYS2001 has 2 surveys (per the beforeEach seed), each with 6 results +
    // 0 comments. Delete should clean all of those rows in one transaction.
    const before = {
      units: (db.prepare('SELECT COUNT(*) AS n FROM unit').get() as { n: number }).n,
      offerings: (db.prepare('SELECT COUNT(*) AS n FROM unit_offering').get() as { n: number }).n,
      surveys: (db.prepare('SELECT COUNT(*) AS n FROM unit_survey').get() as { n: number }).n,
      results: (db.prepare('SELECT COUNT(*) AS n FROM unit_survey_result').get() as { n: number }).n,
    };

    const result = unitDetail.deleteUnit(db, { unitCode: 'ISYS2001' });

    expect(result.surveys_deleted).toBe(2);
    expect(result.unit_removed).toBe(true);
    // Counts dropped by the expected amounts.
    const after = {
      units: (db.prepare('SELECT COUNT(*) AS n FROM unit').get() as { n: number }).n,
      offerings: (db.prepare('SELECT COUNT(*) AS n FROM unit_offering').get() as { n: number }).n,
      surveys: (db.prepare('SELECT COUNT(*) AS n FROM unit_survey').get() as { n: number }).n,
      results: (db.prepare('SELECT COUNT(*) AS n FROM unit_survey_result').get() as { n: number }).n,
    };
    expect(after.units).toBe(before.units - 1);
    expect(after.offerings).toBeLessThan(before.offerings);
    expect(after.surveys).toBe(before.surveys - 2);
    expect(after.results).toBe(before.results - 12); // 2 surveys × 6 Insight Qs each
    // Other units untouched.
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'MKTG1000'`).get()).toBeTruthy();
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'LAWS1000'`).get()).toBeTruthy();
  });

  it('deleteUnit on a non-existent unit returns zero counts (no throw)', () => {
    const result = unitDetail.deleteUnit(db, { unitCode: 'NEVEREXISTED' });
    expect(result.surveys_deleted).toBe(0);
    expect(result.unit_removed).toBe(false);
  });

  it('deleteUnit also removes the unit\'s comments', () => {
    // MKTG1000 was seeded with one comment ("Loved it"). After delete, that
    // comment shouldn't survive.
    const before = (db.prepare('SELECT COUNT(*) AS n FROM comment').get() as { n: number }).n;
    const result = unitDetail.deleteUnit(db, { unitCode: 'MKTG1000' });
    expect(result.comments_deleted).toBe(1);
    const after = (db.prepare('SELECT COUNT(*) AS n FROM comment').get() as { n: number }).n;
    expect(after).toBe(before - 1);
  });

  it('deleteSurvey removes one survey and leaves the offering when other surveys exist for it', () => {
    // Seed an extra ISYS2001 S2 survey at a *different* campus so the
    // offering for the original S2 survey is the only one with that
    // (unit, year, semester, campus, mode). Then delete the original S2
    // — its offering should also disappear (no surveys left for it), but
    // ISYS2001 itself should NOT, because S1 still has data.
    const s2 = db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = 'ISYS2001' AND uo.semester = 'Semester 2'`,
      )
      .get() as { survey_id: number };

    const result = unitDetail.deleteSurvey(db, { surveyId: s2.survey_id });

    expect(result.unit_code).toBe('ISYS2001');
    expect(result.offering_removed).toBe(true); // S2 offering had only this one survey
    expect(result.unit_removed).toBe(false); // S1 offering + survey still exist
    // ISYS2001 still in unit table.
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'ISYS2001'`).get()).toBeTruthy();
    // S1 survey still present.
    const remaining = db
      .prepare(`SELECT COUNT(*) AS n FROM unit_survey us
                JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
                WHERE uo.unit_code = 'ISYS2001'`)
      .get() as { n: number };
    expect(remaining.n).toBe(1);
  });

  it('deleteSurvey removes the unit row when it was the last survey for the unit', () => {
    // MKTG1000 has exactly one survey in the seed. Deleting it should cascade
    // up through the offering and the unit itself.
    const m = db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = 'MKTG1000'`,
      )
      .get() as { survey_id: number };

    const result = unitDetail.deleteSurvey(db, { surveyId: m.survey_id });

    expect(result.offering_removed).toBe(true);
    expect(result.unit_removed).toBe(true);
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'MKTG1000'`).get()).toBeFalsy();
  });

  it('deleteSurvey on a non-existent surveyId returns null unit_code (no throw)', () => {
    const result = unitDetail.deleteSurvey(db, { surveyId: 99999 });
    expect(result.unit_code).toBeNull();
    expect(result.offering_removed).toBe(false);
    expect(result.unit_removed).toBe(false);
    expect(result.snapshot).toBeNull();
  });
});

// Undo support: every delete returns a snapshot of the removed rows;
// restoreSnapshot re-inserts them verbatim (explicit PKs) in FK order so
// "undo last delete" brings back exactly what was removed — and refuses
// (rolls back, throws) when the data has since been re-imported.
describe('delete snapshot / restoreSnapshot', () => {
  const TABLES = ['unit', 'unit_offering', 'unit_survey', 'unit_survey_result', 'comment', 'benchmark'] as const;
  const countAll = () =>
    Object.fromEntries(
      TABLES.map((t) => [t, (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n]),
    );

  // Give a unit's first survey a benchmark row so the benchmark table is
  // exercised by the round-trip (the seed surveys carry none).
  const addBenchmark = (unitCode: string) => {
    const s = db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = ? LIMIT 1`,
      )
      .get(unitCode) as { survey_id: number };
    const q = db.prepare(`SELECT question_id FROM question LIMIT 1`).get() as { question_id: number };
    db.prepare(
      `INSERT INTO benchmark (survey_id, question_id, group_type, group_description, percent_agree, response_count)
       VALUES (?, ?, 'School', 'School of Testing', 81.5, 120)`,
    ).run(s.survey_id, q.question_id);
    return s.survey_id;
  };

  it('deleteUnit → restoreSnapshot brings every table back to its original count', () => {
    // MKTG1000: 1 survey, 6 results, 1 comment ("Loved it") + 1 benchmark.
    addBenchmark('MKTG1000');
    const before = countAll();

    const result = unitDetail.deleteUnit(db, { unitCode: 'MKTG1000' });
    expect(result.snapshot).toBeTruthy();
    expect(result.snapshot.kind).toBe('unit');
    expect(result.snapshot.label).toBe('MKTG1000');
    // Sanity: the delete actually removed rows from every table.
    expect(countAll().unit).toBe(before.unit - 1);

    unitDetail.restoreSnapshot(db, result.snapshot);

    expect(countAll()).toEqual(before);
    // The restored rows are queryable through the normal joins again.
    expect((unitDetail.getUnit(db, { unitCode: 'MKTG1000' }) as any).unit_name).toBe('Marketing');
    expect(unitDetail.getUnitComments(db, { unitCode: 'MKTG1000' }) as any[]).toHaveLength(1);
  });

  it('deleteSurvey (one of several) → restoreSnapshot brings counts back and keeps the label', () => {
    // ISYS2001 has 2 surveys; deleting S2 removes its offering but not the unit.
    addBenchmark('ISYS2001');
    const before = countAll();
    const s2 = db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = 'ISYS2001' AND uo.semester = 'Semester 2'`,
      )
      .get() as { survey_id: number };

    const result = unitDetail.deleteSurvey(db, { surveyId: s2.survey_id });
    expect(result.snapshot).toBeTruthy();
    expect(result.snapshot!.kind).toBe('survey');
    expect(result.snapshot!.label).toBe('ISYS2001 Semester 2 2024');
    // Offering was removed, unit was not — the snapshot mirrors that.
    expect(result.snapshot!.offerings).toHaveLength(1);
    expect(result.snapshot!.unit).toBeNull();

    unitDetail.restoreSnapshot(db, result.snapshot!);

    expect(countAll()).toEqual(before);
    expect(unitDetail.getUnitSurveyHistory(db, { unitCode: 'ISYS2001' }) as any[]).toHaveLength(2);
  });

  it('deleteSurvey of a unit\'s last survey snapshots the unit row too, and restores it', () => {
    const before = countAll();
    const m = db
      .prepare(
        `SELECT us.survey_id FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = 'MKTG1000'`,
      )
      .get() as { survey_id: number };

    const result = unitDetail.deleteSurvey(db, { surveyId: m.survey_id });
    expect(result.unit_removed).toBe(true);
    expect(result.snapshot!.unit).not.toBeNull();

    unitDetail.restoreSnapshot(db, result.snapshot!);
    expect(countAll()).toEqual(before);
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'MKTG1000'`).get()).toBeTruthy();
  });

  it('restoreSnapshot throws (and rolls back) when the data was re-imported since deletion', () => {
    const result = unitDetail.deleteUnit(db, { unitCode: 'MKTG1000' });

    // The user re-imports the same PDF before clicking Undo — the unit,
    // offering and survey rows now exist again under fresh autoincrement ids.
    persistSurvey(
      survey({ unit_code: 'MKTG1000', unit_name: 'Marketing', campus_name: 'Sydney', term: 'Semester 1' }, 88, ['Loved it']),
      db,
      'c.pdf',
    );
    const afterReimport = countAll();

    expect(() => unitDetail.restoreSnapshot(db, result.snapshot)).toThrow(
      /Cannot undo: the data has been re-imported or changed since deletion\./,
    );
    // The failed restore rolled back — nothing was half-inserted.
    expect(countAll()).toEqual(afterReimport);
  });
});

// Post-import change alerts: getPreviousSurveyComparison finds the unit's
// chronologically previous survey (calendar semester ordering, any offering)
// so the import handler can compute deltas for the Import results UI.
describe('getPreviousSurveyComparison', () => {
  const surveyIdFor = (unitCode: string, year: number, semester: string) =>
    (
      db
        .prepare(
          `SELECT us.survey_id FROM unit_survey us
           JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
           WHERE uo.unit_code = ? AND uo.year = ? AND uo.semester = ?`,
        )
        .get(unitCode, year, semester) as { survey_id: number }
    ).survey_id;

  it('returns the chronologically previous survey with both periods\' figures', () => {
    // Seed: ISYS2001 S1 2024 (overall 60) then S2 2024 (overall 90), both
    // with response_rate 50. Comparing the S2 import should find S1.
    const s2 = surveyIdFor('ISYS2001', 2024, 'Semester 2');
    const cmp = getPreviousSurveyComparison(db, s2);

    expect(cmp).not.toBeNull();
    expect(cmp!.unit_code).toBe('ISYS2001');
    expect(cmp!.previous).toEqual({
      year: 2024,
      semester: 'Semester 1',
      overall_experience: 60,
      response_rate: 50,
    });
    expect(cmp!.current.overall_experience).toBe(90);
    expect(cmp!.current.response_rate).toBe(50);
    // Deltas (new minus previous) computed by the caller would be +30 / 0.
    expect(cmp!.current.overall_experience - cmp!.previous.overall_experience).toBe(30);
  });

  it('returns null for a unit\'s first-ever survey', () => {
    expect(getPreviousSurveyComparison(db, surveyIdFor('MKTG1000', 2024, 'Semester 1'))).toBeNull();
    // The earliest ISYS2001 survey also has nothing before it.
    expect(getPreviousSurveyComparison(db, surveyIdFor('ISYS2001', 2024, 'Semester 1'))).toBeNull();
  });

  it('orders by year first, then calendar semester rank — and ignores other units', () => {
    // A 2025 S1 import for ISYS2001 should compare against 2024 S2 (the
    // latest earlier period), not 2024 S1, and not MKTG1000's surveys.
    const r = persistSurvey(survey({ unit_code: 'ISYS2001', term: 'Semester 1', year: '2025' }, 70), db, 'e.pdf');
    const cmp = getPreviousSurveyComparison(db, r.surveyId!);

    expect(cmp!.previous.year).toBe(2024);
    expect(cmp!.previous.semester).toBe('Semester 2');
    expect(cmp!.previous.overall_experience).toBe(90);
    expect(cmp!.current.overall_experience).toBe(70);
  });

  it('compares across offerings (a different campus still counts as previous)', () => {
    // MKTG1000 S1 2024 exists at Sydney; import S2 2024 at Bentley.
    const r = persistSurvey(
      survey({ unit_code: 'MKTG1000', unit_name: 'Marketing', campus_name: 'Bentley', term: 'Semester 2' }, 92),
      db,
      'f.pdf',
    );
    const cmp = getPreviousSurveyComparison(db, r.surveyId!);
    expect(cmp).not.toBeNull();
    expect(cmp!.previous.semester).toBe('Semester 1');
    expect(cmp!.previous.overall_experience).toBe(88);
  });

  it('does not treat a same-period survey at another campus as "previous"', () => {
    // LAWS1000 has only S1 2024 (Bentley). Importing S1 2024 at Sydney is the
    // same period — there is no strictly earlier survey, so no comparison.
    const r = persistSurvey(
      survey({ unit_code: 'LAWS1000', unit_name: 'Law', campus_name: 'Sydney', term: 'Semester 1' }, 65),
      db,
      'g.pdf',
    );
    expect(getPreviousSurveyComparison(db, r.surveyId!)).toBeNull();
  });

  it('returns null for an unknown survey id', () => {
    expect(getPreviousSurveyComparison(db, 99999)).toBeNull();
  });
});

describe('insights queries', () => {
  it('trendingUp finds the improving unit', () => {
    const rows = insights.getTrendingUp(db) as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].unit_code).toBe('ISYS2001');
    expect(rows[0].score_change).toBe(30);
  });

  it('needsAttention flags the unit whose latest survey is weak', () => {
    const rows = insights.getNeedsAttention(db) as any[];
    expect(rows.map((r) => r.unit_code)).toEqual(['LAWS1000']);
    expect(rows[0].issue_type).toBe('Low Score');
  });
});
