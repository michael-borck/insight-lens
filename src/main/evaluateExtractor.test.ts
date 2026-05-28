// Tests for the eValuate PDF extractor.
//
// Uses the real sample PDFs at
//   /Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/eValuate-reports/
// rather than synthesised fixtures — these are the actual Curtin "Full Unit
// Report" PDFs the importer will see, and the layout quirks (justified text
// with broken words, two-column-per-page question layout) can't be reliably
// synthesised. Sample paths are absolute; tests skip themselves if the
// folder isn't present (e.g. running on someone else's machine).
//
// Phase 1 tests verify the extractor in isolation. Phase 2 will add tests
// for format detection and the importer dispatch.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractEvaluateData,
  EVALUATE_QUESTIONS,
  expandConcatenatedPercentageTriples,
} from './evaluateExtractor';

const SAMPLES_DIR =
  '/Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/eValuate-reports';

function sampleExists(filename: string): boolean {
  return fs.existsSync(path.join(SAMPLES_DIR, filename));
}

// Pick a sample we've manually inspected to drive most assertions. If the
// folder isn't present on this machine, the whole file's tests skip with a
// clear note (better than ENOENT mid-test).
const ANCHOR_SAMPLE = 'FUR_Report-ISYS6011-s1-2019.pdf';
const ANCHOR_PATH = path.join(SAMPLES_DIR, ANCHOR_SAMPLE);
const samplesAvailable = sampleExists(ANCHOR_SAMPLE);

describe.skipIf(!samplesAvailable)('extractEvaluateData', () => {
  it('parses the anchor sample (ISYS6011 s1 2019) without error', async () => {
    const result = await extractEvaluateData(ANCHOR_PATH);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.format).toBe('evaluate');
  });

  it('extracts the unit-info block', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    expect(data!.unit_info.unit_code).toBe('ISYS6011');
    expect(data!.unit_info.unit_name).toBe('Computer Forensics');
    expect(data!.unit_info.year).toBe('2019');
    expect(data!.unit_info.term).toBe('Semester 1');
    expect(data!.unit_info.evaluation_period).toBe('2019 Semester 1');
  });

  it('extracts response stats', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    // From manual inspection of the PDF: Responses=3, Enrolment=17, Rate=18%.
    expect(data!.response_stats.responses).toBe(3);
    expect(data!.response_stats.enrollments).toBe(17);
    expect(data!.response_stats.response_rate).toBe(18);
  });

  it('returns all 11 canonical questions (in order)', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    expect(data!.questions).toHaveLength(11);
    for (let i = 0; i < 11; i++) {
      expect(data!.questions[i].number).toBe(i + 1);
      expect(data!.questions[i].text).toBe(EVALUATE_QUESTIONS[i].text);
    }
  });

  it('extracts Unit/Faculty/University agreement % for each question', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    // From manual inspection of the PDF: Q1 = 67/91/90.
    expect(data!.questions[0].unit_agreement).toBe(67);
    expect(data!.questions[0].faculty_agreement).toBe(91);
    expect(data!.questions[0].university_agreement).toBe(90);

    // Every question should have all three populated (no nulls).
    for (const q of data!.questions) {
      expect(q.unit_agreement).toBeDefined();
      expect(q.faculty_agreement).toBeDefined();
      expect(q.university_agreement).toBeDefined();
      // Sanity: all percentages 0-100.
      expect(q.unit_agreement!).toBeGreaterThanOrEqual(0);
      expect(q.unit_agreement!).toBeLessThanOrEqual(100);
    }
  });

  it('extracts qualitative comments (helpful + improvements)', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    // The anchor sample has at least one comment in each section
    // (per manual inspection).
    expect(data!.qualitative.most_helpful.length).toBeGreaterThan(0);
    expect(data!.qualitative.improvements.length).toBeGreaterThan(0);
    // Comments should look like sentences (not empty / not just whitespace).
    for (const c of data!.qualitative.most_helpful) {
      expect(c.length).toBeGreaterThan(5);
    }
  });

  it('surfaces the UJ-handling note for downstream consumers', async () => {
    const { data } = await extractEvaluateData(ANCHOR_PATH);
    expect(data!.notes.length).toBeGreaterThan(0);
    expect(data!.notes.join(' ')).toMatch(/Unable to Judge|UJ/i);
  });
});

// ── expandConcatenatedPercentageTriples ─────────────────────────────────
// Pre-2010 FUR PDFs render the Unit/Faculty/University percentages as a
// single concatenated digit run rather than three space-separated values.
// The helper that expands those runs is the keystone of legacy-format
// support — exercise its key shapes here so the modern-PDF corpus sweep
// doesn't have to carry the entire weight of regression coverage.

describe('expandConcatenatedPercentageTriples', () => {
  it('splits a 6-digit run into three 2-digit values', () => {
    expect(expandConcatenatedPercentageTriples('foo 677882 bar')).toBe('foo 67 78 82 bar');
  });

  it('splits a 9-digit run into three 3-digit values when all parts ≤ 100', () => {
    expect(expandConcatenatedPercentageTriples('100100100')).toBe('100 100 100');
  });

  it('leaves a 9-digit run untouched when a part would exceed 100', () => {
    // e.g. a stray ID or phone fragment — not a percentage triple, leave alone.
    expect(expandConcatenatedPercentageTriples('123456789')).toBe('123456789');
  });

  it('splits 7-digit "100 + 2-digit + 2-digit" runs', () => {
    expect(expandConcatenatedPercentageTriples('1008782')).toBe('100 87 82');
  });

  it('splits 7-digit "2-digit + 100 + 2-digit" runs', () => {
    expect(expandConcatenatedPercentageTriples('8710082')).toBe('87 100 82');
  });

  it('splits 7-digit "2-digit + 2-digit + 100" runs', () => {
    expect(expandConcatenatedPercentageTriples('8782100')).toBe('87 82 100');
  });

  it('splits 8-digit "100 100 2-digit" runs', () => {
    expect(expandConcatenatedPercentageTriples('10010087')).toBe('100 100 87');
  });

  it('does not split short or spaced runs', () => {
    expect(expandConcatenatedPercentageTriples('67 78 82')).toBe('67 78 82');
    expect(expandConcatenatedPercentageTriples('100')).toBe('100');
    expect(expandConcatenatedPercentageTriples('14')).toBe('14');
  });

  it('handles multiple triples in one string', () => {
    expect(expandConcatenatedPercentageTriples('677882 939186')).toBe('67 78 82 93 91 86');
  });
});

// ── Cross-sample sanity sweep ───────────────────────────────────────────
// Run the extractor on every sample in the corpus and assert the basic
// shape contract: 11 questions populated, unit code present, response
// stats present. This catches layout variations between unit codes /
// semesters that the anchor sample doesn't exercise.

describe.skipIf(!samplesAvailable)('extractEvaluateData — corpus sanity sweep', () => {
  // Sweep the top-level corpus AND any "Problems/" subdirectory the user
  // has built up (we keep edge-case PDFs there during triage; once fixed,
  // they should stay covered so we don't regress). Listed as
  // { dir, filename } so test names show provenance and paths resolve.
  const topLevel = samplesAvailable
    ? fs
        .readdirSync(SAMPLES_DIR)
        .filter((f) => f.startsWith('FUR_Report-') && f.endsWith('.pdf'))
        .map((f) => ({ dir: SAMPLES_DIR, filename: f }))
    : [];
  const problemsDir = path.join(SAMPLES_DIR, 'Problems');
  const problemsLevel = fs.existsSync(problemsDir)
    ? fs
        .readdirSync(problemsDir)
        .filter((f) => f.startsWith('FUR_Report-') && f.endsWith('.pdf'))
        .map((f) => ({ dir: problemsDir, filename: f }))
    : [];
  const allSamples = [...topLevel, ...problemsLevel];

  it.each(allSamples)('parses $filename end-to-end', async ({ dir, filename }) => {
    const result = await extractEvaluateData(path.join(dir, filename));
    expect(result.success).toBe(true);
    const d = result.data!;
    // Unit code is the most universally reliable field; assert it's present.
    // Two formats observed in the corpus: modern alpha-numeric (ISYS6011)
    // and legacy purely-numeric (10163, 308717).
    expect(d.unit_info.unit_code).toMatch(/^(?:[A-Z]{2,5}\d{3,5}|\d{4,6})$/);
    // All 11 questions should at minimum be in the array (numbers + text);
    // some samples may have missing agreement values in the wild, so we
    // don't require all three figures to be present on every PDF.
    expect(d.questions).toHaveLength(11);
    // Response rate, if present, should be a valid percentage.
    if (d.response_stats.response_rate !== undefined) {
      expect(d.response_stats.response_rate).toBeGreaterThanOrEqual(0);
      expect(d.response_stats.response_rate).toBeLessThanOrEqual(100);
    }
    // Year + term MUST resolve — every well-formed eValuate PDF carries an
    // "Evaluation period: <year> <term>" line. Missing either field means
    // the term taxonomy regex hasn't caught a real-world variant (this is
    // exactly the bug "Summer" surfaced in v1.7.1's Problems/ pair).
    expect(d.unit_info.year).toMatch(/^\d{4}$/);
    expect(d.unit_info.term).toMatch(/^(Semester\s+[123]|Trimester\s+[123]|Summer)$/);
    // Every parsed unit_agreement must be in a plausible percentage range.
    // The bug that motivated v1.7.4: legacy pre-2010 PDFs were storing 1/2
    // (digits leaked from page footers) as Q3/Q7/Q11's unit_agreement when
    // the real concatenated percentage triples were silently skipped. Set
    // the lower bound at 5 — any genuine survey response with < 5% agreement
    // across an entire teaching cohort would be a story in itself, but
    // certainly distinguishable from a parse artifact.
    for (const q of d.questions) {
      if (q.unit_agreement !== undefined) {
        expect(q.unit_agreement).toBeGreaterThanOrEqual(5);
        expect(q.unit_agreement).toBeLessThanOrEqual(100);
      }
    }
  });
});
