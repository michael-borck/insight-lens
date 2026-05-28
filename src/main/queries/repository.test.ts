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
