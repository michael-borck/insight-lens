import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from '../schema';
import { persistSurvey } from '../importer';
import type { SurveyData } from '../pdfExtractor';
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
