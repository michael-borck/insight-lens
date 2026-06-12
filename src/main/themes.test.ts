import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';
import { persistSurvey } from './importer';
import type { SurveyData } from './pdfExtractor';
import { classifyComment, buildThemeSummaryPrompt, THEMES } from './themes';
import type { ThemeSummaryComment } from './themes';
import { getThemeOverview, getThemeComments } from './queries/themes';

describe('classifyComment', () => {
  it('returns several themes for a comment touching several topics', () => {
    const themes = classifyComment('Too much workload and the exam marking was slow');
    expect(themes).toContain('workload'); // 'too much', 'workload'
    expect(themes).toContain('assessment'); // 'exam', 'marking'
    expect(themes).toHaveLength(2);
  });

  it('returns [] when no theme keyword appears', () => {
    expect(classifyComment('I had a nice time this semester')).toEqual([]);
    expect(classifyComment('')).toEqual([]);
  });

  it('is word-boundary aware: "example" does not trigger the "exam" keyword', () => {
    expect(classifyComment('For example, consider this case')).toEqual([]);
    // ...but the actual word does match.
    expect(classifyComment('The exam was fair')).toEqual(['assessment']);
  });

  it('matches multi-word phrases and is case-insensitive', () => {
    expect(classifyComment('There was NOT ENOUGH TIME to finish')).toEqual(['workload']);
    expect(classifyComment('The Lecturer explained everything')).toEqual(['teaching']);
  });

  it('every taxonomy entry has a name, icon and a non-trivial keyword list', () => {
    for (const t of THEMES) {
      expect(t.name).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.keywords.length).toBeGreaterThanOrEqual(8);
      // Keywords are stored lowercase (the classifier lowercases the text only).
      expect(t.keywords.every((k) => k === k.toLowerCase())).toBe(true);
    }
  });
});

describe('buildThemeSummaryPrompt', () => {
  const comment = (i: number): ThemeSummaryComment => ({
    comment_text: `Distinct comment number ${i} about the exam`,
    sentiment_label: i % 2 === 0 ? 'positive' : 'negative',
    unit_code: 'ISYS2001',
    year: 2024,
    semester: 'Semester 1',
  });

  it('includes the theme name and the comment text in the prompts', () => {
    const { system, user } = buildThemeSummaryPrompt('Assessment', [comment(1), comment(2)]);
    expect(system).toContain('Assessment');
    expect(user).toContain('Assessment');
    expect(user).toContain('Distinct comment number 1 about the exam');
    expect(user).toContain('Distinct comment number 2 about the exam');
    expect(user).toContain('ISYS2001');
    expect(user).toContain('2 of 2 comments included');
  });

  it('caps the included comments at 80 and notes how many of the total made it in', () => {
    const comments = Array.from({ length: 90 }, (_, i) => comment(i + 1));
    const { user } = buildThemeSummaryPrompt('Workload', comments);
    // The 80th comment is the last one in; the 85th must not appear.
    expect(user).toContain('Distinct comment number 80 about the exam');
    expect(user).not.toContain('Distinct comment number 85 about the exam');
    expect(user).toContain('80 of 90 comments included');
  });

  it('instructs the observation/suggestion structure without invented statistics', () => {
    const { system } = buildThemeSummaryPrompt('Teaching', [comment(1)]);
    expect(system).toMatch(/3 to 5 concise observations/);
    expect(system).toMatch(/2 to 3 actionable suggestions/);
    expect(system).toMatch(/never invent statistics/);
    expect(system).toMatch(/ONLY in the provided comments/);
  });
});

// Query-level tests: in-memory DatabaseSync with the real schema, seeded
// through the real import path so comments carry sentiment_score/label
// (same style as queries/repository.test.ts).
describe('theme queries', () => {
  function makeDb(): any {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    createSchema(db);
    return db;
  }

  function survey(
    unit: Partial<SurveyData['unit_info']>,
    comments: string[],
  ): SurveyData {
    return {
      unit_info: { unit_code: 'ISYS2001', unit_name: 'Intro to IS', campus_name: 'Bentley', mode: 'Internal', term: 'Semester 1', year: '2024', ...unit },
      response_stats: { enrollments: 100, responses: 50, response_rate: 50 },
      percentage_agreement: { engagement: 80, resources: 75, support: 70, assessments: 85, expectations: 90, overall: 80 },
      benchmarks: [],
      detailed_results: {},
      comments,
    };
  }

  let db: any;
  beforeEach(() => {
    db = makeDb();
    // 2024: a negative assessment comment, a neutral workload+assessment
    // comment, and an unclassifiable positive one.
    persistSurvey(
      survey({ year: '2024' }, [
        'The exam was terrible and the rubric was unclear', // negative; assessment
        'Too much workload and the marking was unfair', // neutral; workload + assessment
        'I had a wonderful semester', // positive; no theme
      ]),
      db,
      'a.pdf',
    );
    // 2023: a positive assessment+support comment.
    persistSurvey(
      survey({ year: '2023' }, [
        'The quiz was great and feedback was helpful', // positive; assessment + support
      ]),
      db,
      'b.pdf',
    );
  });

  it('overview aggregates counts, sentiment split and yearly trend per theme', () => {
    const { themes, totals } = getThemeOverview(db);

    expect(totals.totalComments).toBe(4);
    expect(totals.classifiedComments).toBe(3);
    expect(totals.unclassifiedComments).toBe(1);

    // Sorted by commentCount desc — assessment (3) leads.
    expect(themes[0].key).toBe('assessment');
    const assessment = themes[0];
    expect(assessment.commentCount).toBe(3);
    expect(assessment.positiveCount).toBe(1);
    expect(assessment.neutralCount).toBe(1);
    expect(assessment.negativeCount).toBe(1);
    // Scores: -0.4 (terrible+unclear), 0, +0.4 (great+helpful) → mean 0.
    expect(assessment.avgSentiment).toBeCloseTo(0);
    expect(assessment.yearly).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 2 },
    ]);

    // Themes with zero comments are omitted.
    expect(themes.map((t) => t.key).sort()).toEqual(['assessment', 'support', 'workload']);
  });

  it('overview respects the year filter', () => {
    const { themes, totals } = getThemeOverview(db, { year: 2024 });
    expect(totals.totalComments).toBe(3);
    expect(totals.unclassifiedComments).toBe(1);
    const assessment = themes.find((t) => t.key === 'assessment')!;
    expect(assessment.commentCount).toBe(2);
    // The 2023 support comment is filtered out entirely.
    expect(themes.find((t) => t.key === 'support')).toBeUndefined();
  });

  it('themeComments returns most-negative first with unit/period metadata', () => {
    const rows = getThemeComments(db, { theme: 'assessment' }) as any[];
    expect(rows).toHaveLength(3);
    expect(rows[0].comment_text).toBe('The exam was terrible and the rubric was unclear');
    expect(rows[0].sentiment_label).toBe('negative');
    expect(rows[2].sentiment_label).toBe('positive');
    expect(rows[0].unit_code).toBe('ISYS2001');
    expect(rows[0].year).toBe(2024);
    expect(rows[0].semester).toBe('Semester 1');
  });

  it('themeComments respects the year filter and the limit', () => {
    const rows2024 = getThemeComments(db, { theme: 'assessment', year: 2024 }) as any[];
    expect(rows2024).toHaveLength(2);
    expect(rows2024.every((r) => r.year === 2024)).toBe(true);

    const capped = getThemeComments(db, { theme: 'assessment', limit: 1 }) as any[];
    expect(capped).toHaveLength(1);
    expect(capped[0].sentiment_label).toBe('negative'); // most negative survives the cap
  });
});
