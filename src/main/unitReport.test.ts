import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';
import { persistSurvey } from './importer';
import type { SurveyData } from './pdfExtractor';
import { buildUnitReportHtml } from './unitReport';

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

const GENERATED = new Date('2026-06-12T10:00:00Z');

let db: any;
beforeEach(() => {
  db = makeDb();
  // ISYS2001: two semesters, one clearly positive and one clearly negative comment.
  persistSurvey(
    survey({ unit_code: 'ISYS2001', term: 'Semester 1' }, 60, [
      'This unit was terrible and confusing',
    ]),
    db,
    'a.pdf',
  );
  persistSurvey(
    survey({ unit_code: 'ISYS2001', term: 'Semester 2' }, 90, [
      'Excellent unit, I loved the great lectures',
    ]),
    db,
    'b.pdf',
  );
  // LAWS1000: a unit with no comments at all.
  persistSurvey(survey({ unit_code: 'LAWS1000', unit_name: 'Law', term: 'Semester 1' }, 55), db, 'c.pdf');
});

describe('buildUnitReportHtml', () => {
  it('includes the unit code, name and every survey period', () => {
    const html = buildUnitReportHtml(db, 'ISYS2001', GENERATED);

    expect(html).toContain('ISYS2001');
    expect(html).toContain('Intro to IS');
    expect(html).toContain('Semester 1 2024');
    expect(html).toContain('Semester 2 2024');
    // Latest-survey section is headed by the newest period (S2 2024).
    expect(html).toContain('Latest Survey Results (Semester 2 2024)');
    // Per-question rows from the latest survey.
    expect(html).toContain('Overall, this unit was a worthwhile experience');
  });

  it('includes the generated date passed in by the caller', () => {
    const html = buildUnitReportHtml(db, 'ISYS2001', GENERATED);
    expect(html).toContain(GENERATED.toLocaleDateString());
  });

  it('includes student comments in the feedback section', () => {
    const html = buildUnitReportHtml(db, 'ISYS2001', GENERATED);
    expect(html).toContain('Excellent unit, I loved the great lectures');
    expect(html).toContain('This unit was terrible and confusing');
    expect(html).toContain('Student Feedback');
  });

  it('handles a unit with no comments gracefully', () => {
    const html = buildUnitReportHtml(db, 'LAWS1000', GENERATED);
    expect(html).toContain('LAWS1000');
    expect(html).toContain('Semester 1 2024');
    expect(html).toContain('No comments recorded');
    // No comment lists rendered.
    expect(html).not.toContain('Most Positive Comments');
    expect(html).not.toContain('Most Critical Comments');
  });

  it('escapes HTML in comment text', () => {
    persistSurvey(
      survey({ unit_code: 'MKTG1000', unit_name: 'Marketing', term: 'Semester 1' }, 88, [
        'Great <script>alert("x")</script> unit',
      ]),
      db,
      'd.pdf',
    );
    const html = buildUnitReportHtml(db, 'MKTG1000', GENERATED);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('throws for an unknown unit code', () => {
    expect(() => buildUnitReportHtml(db, 'NEVEREXISTED', GENERATED)).toThrow(/not found/);
  });
});
