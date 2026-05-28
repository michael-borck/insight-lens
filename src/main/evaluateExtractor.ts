// eValuate PDF extractor — parses Curtin's legacy eValuate "Full Unit Report"
// (FUR_Report-*.pdf) into a structured shape parallel to pdfExtractor.ts's
// Insight extractor.
//
// Curtin retired eValuate in favour of Insight; we support this format because
// many lecturers have historical eValuate reports relevant to promotion
// applications and longitudinal teaching evidence. Phase 1: extractor only.
// Phase 2 will add format detection + importer dispatch.
//
// The eValuate report shape (from sample PDFs in
//   /Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/):
//
//   - Page 1: ethics/sharing preamble (skipped)
//   - Page 2: metadata block + Q1-Q2 (two questions side by side)
//   - Pages 2-5: 11 quantitative questions, two per page, each with three
//     percentages: Unit Agreement %, Faculty Agreement %, University Agreement %
//   - Page 5-6: qualitative items — "most helpful aspects" and "improvements"
//     prompts, with dash-prefixed comments
//
// Key differences from Insight:
//   1. eValuate has 11 questions, Insight has 6.
//   2. eValuate question texts are canonical Curtin wording (hard-coded below);
//      Insight uses different wording per the renewed instrument.
//   3. eValuate quotes only Unit/Faculty/University agreement %s in the text
//      layer — the per-response frequency distribution (SA/A/D/SD/UJ) is in
//      the chart graphics and not text-extractable. We store Unit% as
//      percent_agree and Faculty/University as benchmark rows.
//   4. eValuate's "Unable to Judge" (UJ) bucket is implicit — the formula
//      `(SA+A)/(SA+A+D+SD)` already excludes UJ per Curtin's published method,
//      and the per-PDF Unit/Faculty/University figures use that formula.
//      No data is lost beyond what eValuate itself never quoted as text.
//
// Two-column PDF layout: each page renders 2 questions side by side, so naive
// text extraction interleaves them (Q1 text + Q2 text + Q1 numbers + Q2
// numbers in some order). We use a column-aware `pagerender` callback that
// sorts items by y then splits at the page-width midline, emitting left-
// column items before right-column items so each question's marker, text,
// and 3 numbers appear contiguously.

import * as fs from 'fs';
import log from 'electron-log';

// pdf-parse uses pdfjs-dist internally and exposes the page object to the
// pagerender callback. We don't need to import pdfjs-dist directly.
const pdfParse = require('pdf-parse');

// ── Canonical questions ─────────────────────────────────────────────────
// These are eValuate's 11 standard quantitative items (Curtin University's
// published instrument). They don't vary across PDFs; we look them up by
// question number rather than parsing the wrapped/justified text out of
// the PDF. The `short` is for compact display in charts/tables.
export const EVALUATE_QUESTIONS: ReadonlyArray<{
  num: number;
  text: string;
  short: string;
}> = [
  { num: 1,  text: 'The learning outcomes in this unit are clearly identified.',                        short: 'Learning outcomes clear' },
  { num: 2,  text: 'The learning experiences in this unit help me to achieve the learning outcomes.',    short: 'Learning experiences' },
  { num: 3,  text: 'The learning resources in this unit help me to achieve the learning outcomes.',      short: 'Learning resources' },
  { num: 4,  text: 'The assessment tasks in this unit evaluate my achievement of the learning outcomes.', short: 'Assessment tasks' },
  { num: 5,  text: 'Feedback on my work in this unit helps me to achieve the learning outcomes.',        short: 'Feedback helps' },
  { num: 6,  text: 'The workload in this unit is appropriate to the achievement of the learning outcomes.', short: 'Workload appropriate' },
  { num: 7,  text: 'The quality of teaching in this unit helps me to achieve the learning outcomes.',    short: 'Quality of teaching' },
  { num: 8,  text: 'I am motivated to achieve the learning outcomes in this unit.',                      short: 'Motivated' },
  { num: 9,  text: 'I make best use of the learning experiences in this unit.',                          short: 'Best use of experiences' },
  { num: 10, text: 'I think about how I can learn more effectively in this unit.',                       short: 'Reflect on learning' },
  { num: 11, text: 'Overall, I am satisfied with this unit.',                                            short: 'Overall satisfaction' },
];

// ── Output shape ────────────────────────────────────────────────────────

export interface EvaluateQuestionResult {
  /** 1-11, matches EVALUATE_QUESTIONS[i-1]. */
  number: number;
  text: string;
  short: string;
  /** Per the Curtin formula: (SA+A)/(SA+A+D+SD), UJ excluded. */
  unit_agreement?: number;
  faculty_agreement?: number;
  university_agreement?: number;
}

export interface EvaluateSurveyData {
  /** Format discriminator — Phase 2's dispatcher uses this. */
  format: 'evaluate';
  unit_info: {
    unit_code?: string;
    unit_name?: string;
    unit_coordinator?: string;
    /** "Semester 1", "Semester 2", "Trimester 1", … */
    term?: string;
    /** "2019" */
    year?: string;
    /** Raw from the PDF, e.g. "2019 Semester 1". */
    evaluation_period?: string;
    /** "All results aggregated", "Internal", … — raw from PDF. */
    aggregation?: string;
  };
  response_stats: {
    enrollments?: number;
    responses?: number;
    /** Percentage 0-100. */
    response_rate?: number;
  };
  questions: EvaluateQuestionResult[];
  /** The two qualitative prompts at the end of an eValuate report. */
  qualitative: {
    most_helpful: string[];
    improvements: string[];
  };
  /** Extractor caveats surfaced to consumers (UJ handling, etc.). */
  notes: string[];
}

// ── Entry point ─────────────────────────────────────────────────────────

export async function extractEvaluateData(
  pdfPath: string,
): Promise<{ success: boolean; data?: EvaluateSurveyData; error?: string }> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);

    // Column-aware page renderer: sorts items by y (top-down), splits the
    // page into left/right halves, and emits left items before right items.
    // This puts each question's marker + text + 3 numbers in contiguous
    // reading order, which the regexes below depend on.
    // Column-aware page renderer. The eValuate FUR layout has TWO halves
    // per page that pdf-parse's default concatenation interleaves in a way
    // that drops the right-column content (response stats + the
    // Unit/Faculty/University agreement %s). By splitting items by their
    // x-position and emitting left items then right items, we get every
    // text run, in a deterministic per-page reading order.
    //
    // We compute the column split from the items' own x range (pdf-parse's
    // pageData.getViewport() returns nulls).
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const items = textContent.items
          .map((it: any) => ({
            str: it.str,
            x: it.transform[4],
            y: it.transform[5],
          }))
          .filter((it: any) => it.str && it.str.trim().length > 0);

        if (items.length === 0) {
          return '\n--- PAGE BREAK ---\n\n';
        }

        const xs = items.map((it: any) => it.x);
        const midX = (Math.min(...xs) + Math.max(...xs)) / 2;

        // Sort each column top-to-bottom (PDF y goes UP from page bottom),
        // breaking ties left-to-right.
        const left = items
          .filter((it: any) => it.x < midX)
          .sort((a: any, b: any) => b.y - a.y || a.x - b.x);
        const right = items
          .filter((it: any) => it.x >= midX)
          .sort((a: any, b: any) => b.y - a.y || a.x - b.x);

        return (
          left.map((it: any) => it.str).join(' ') +
          '\n--- COLUMN BREAK ---\n' +
          right.map((it: any) => it.str).join(' ') +
          '\n\n--- PAGE BREAK ---\n\n'
        );
      },
    });

    const fullText: string = pdfData.text || '';
    const data: EvaluateSurveyData = {
      format: 'evaluate',
      unit_info: {},
      response_stats: {},
      questions: EVALUATE_QUESTIONS.map((q) => ({
        number: q.num,
        text: q.text,
        short: q.short,
      })),
      qualitative: { most_helpful: [], improvements: [] },
      notes: [
        'Curtin "Unable to Judge" (UJ) responses are excluded from agreement % per the Curtin formula: (SA+A)/(SA+A+D+SD). eValuate PDFs do not text-render the SA/A/D/SD/UJ frequency distribution; only the derived Unit/Faculty/University agreement % is available.',
      ],
    };

    extractUnitInfo(fullText, data);
    extractResponseStats(fullText, data);
    extractQuestionResults(fullText, data);
    extractQualitative(fullText, data);

    return { success: true, data };
  } catch (error) {
    log.error('eValuate PDF extraction error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ── Extractors per section ──────────────────────────────────────────────

function extractUnitInfo(text: string, data: EvaluateSurveyData) {
  // The metadata block on page 2 contains key/value lines. Even after our
  // column-aware reordering some fields may be split across whitespace, so
  // each regex is tolerant of intervening whitespace.
  // Two formats observed: modern Curtin alpha-numeric ("ISYS6011") and
  // legacy purely-numeric ("10163"). The legacy IDs appear in eValuate
  // reports predating the standard unit-code scheme; we accept them as-is.
  const codeMatch = text.match(/Unit\s+Code:\s*([A-Z]{2,5}\s*\d{3,5}|\d{4,6})/i);
  if (codeMatch) {
    data.unit_info.unit_code = codeMatch[1].replace(/\s+/g, '');
  }

  // The metadata items are joined by spaces in extraction order, and that
  // order varies between samples (some have "Unit Code:" right after the
  // name; others have "Responses(n):" or "Frequency" interleaved). Match
  // the unit name as anything non-greedy up to ANY of the known next
  // labels.
  const nameMatch = text.match(
    /Unit\s+Name:\s*(.+?)\s+(?:Unit\s+Code:|Unit\s+Coordinator:|Frequency\s+Distribution|Responses\s*\()/i,
  );
  if (nameMatch) {
    data.unit_info.unit_name = nameMatch[1].trim();
  }

  const coordMatch = text.match(
    /Unit\s+Coordinator:\s*(.+?)\s+(?:Frequency\s+Distribution|Responses\s*\(|Page\s+\d|Evaluation\s+period:)/i,
  );
  if (coordMatch) {
    data.unit_info.unit_coordinator = coordMatch[1].trim();
  }

  // "Evaluation period: 2019 Semester 1" / "2019 Trimester 1" / "2020 Summer".
  // Curtin's eValuate uses three term taxonomies historically:
  //   • Semester 1/2 (and rarely 3)  — main Bentley academic calendar
  //   • Trimester 1/2/3              — Curtin Mauritius and some onshore partners
  //   • Summer                       — the summer-semester offering; appears
  //                                    standalone (no number suffix). Filenames
  //                                    abbreviate this as `s3` or `t3`, which
  //                                    misled the original taxonomy assumption.
  // Keep the capture group flexible so we accept any of these and store the
  // term verbatim as written in the PDF.
  const periodMatch = text.match(
    /Evaluation\s+period:\s*(\d{4})\s+(Semester\s+[123]|Trimester\s+[123]|Summer)/i,
  );
  if (periodMatch) {
    data.unit_info.year = periodMatch[1];
    data.unit_info.term = periodMatch[2].trim();
    data.unit_info.evaluation_period = `${periodMatch[1]} ${periodMatch[2].trim()}`;
  }

  const aggMatch = text.match(/Aggregation:\s*([^\n]+?)(?:\s+Unit\s+Name|\n)/i);
  if (aggMatch) {
    data.unit_info.aggregation = aggMatch[1].trim();
  }
}

function extractResponseStats(text: string, data: EvaluateSurveyData) {
  // The three values appear in close succession in the metadata block.
  // Match flexibly; eValuate sometimes embeds the labels with line breaks
  // before the numbers.
  const respMatch = text.match(/Responses\s*\(\s*n\s*\):\s*(\d+)/i);
  if (respMatch) data.response_stats.responses = parseInt(respMatch[1], 10);

  const enrolMatch = text.match(/Enrolment\s*\(\s*N\s*\):\s*(\d+)/i);
  if (enrolMatch) data.response_stats.enrollments = parseInt(enrolMatch[1], 10);

  const rateMatch = text.match(/Response\s+Rate:\s*(\d+(?:\.\d+)?)\s*%/i);
  if (rateMatch) data.response_stats.response_rate = parseFloat(rateMatch[1]);
}

function extractQuestionResults(text: string, data: EvaluateSurveyData) {
  // The eValuate FUR right-column structure (after our column-aware
  // pagerender flattens each page's right half) reads:
  //
  //   Responses(n): 3
  //   Enrolment(N): 17
  //   Response Rate: 18 %
  //   Unit Faculty University                             ← TABLE HEADER
  //   Agreement Agreement Agreement
  //   (%) (%) (%)
  //   67 91 90        ← Q1: unit/faculty/university
  //   67 87 86        ← Q2: unit/faculty/university
  //   …               ← Q3..Q11, three numbers each
  //   <qualitative items>
  //
  // The first "Unit Faculty University" run is unique to the agreement
  // table header. Everything between that header and the qualitative
  // section is exactly 11 × 3 = 33 percentages, in question order.
  //
  // Anchoring on the header (not "Chart for Question N", which pdf-parse
  // drops) and slicing the next 33 percentages is the most robust
  // approach we've found.

  const headerRe = /Unit\s+Faculty\s+University/i;
  const headerMatch = headerRe.exec(text);
  if (!headerMatch) return;
  const sliceStart = headerMatch.index + headerMatch[0].length;

  // The qualitative-items section starts the second half of the report
  // (post-quantitative). It's a hard stop for our percentage scan.
  const qualRe = /qualitative\s+items|Please\s+comment\s+on\s+the\s+most\s+helpful/i;
  const qualMatch = qualRe.exec(text.slice(sliceStart));
  const sliceEnd = qualMatch ? sliceStart + qualMatch.index : text.length;

  let block = text.slice(sliceStart, sliceEnd);

  // Legacy-format handling #1: strip page-footer noise. Pre-2010 FURs
  // intermix "Full Unit Report for <name>, YYYY Semester N" and
  // "Page N of N" on every page; their digits leak into the percentage
  // scan and are mistaken for agreement values when the legitimate
  // percentages have been concatenated (see #2). Stripping these
  // textual fragments before scanning eliminates the noise source
  // entirely. No-op on modern PDFs (these phrases appear there too
  // but never interfere because percentages are properly spaced).
  block = block.replace(/Full\s+Unit\s+Report\s+for[^\n]*/gi, ' ');
  block = block.replace(/Page\s+\d+\s+of\s+\d+/gi, ' ');

  // Legacy-format handling #2: expand concatenated percentage triples.
  // Modern FURs render the Unit/Faculty/University agreement row with
  // spaces between values ("67 78 82"). Pre-2010 FURs render it as a
  // single concatenated digit run ("677882"). The unspaced run fails
  // the standalone-percentage regex below (negative look-around requires
  // non-digit boundaries on both sides), so the values would be silently
  // dropped — and the noise digits from page footers would be assigned
  // to questions instead. Expand the common run lengths into spaced
  // triples; do nothing if the split would produce out-of-range values
  // (that's not a percentage triple, leave it for the scanner to drop).
  block = expandConcatenatedPercentageTriples(block);

  // Pull every percentage-like number (0-100, optional decimal). Anchored
  // against digit/period to avoid mid-token noise.
  const numMatches = [...block.matchAll(/(?<![\d.])(\d{1,3}(?:\.\d+)?)(?![\d.])/g)];
  const percentages = numMatches
    .map((m) => parseFloat(m[1]))
    .filter((n) => n >= 0 && n <= 100);

  // Assign 3 at a time to questions 1-11. If we have fewer than 33,
  // populate what we can and leave the rest undefined (the corpus
  // sweep test tolerates partial data).
  for (let q = 0; q < 11 && q * 3 + 2 < percentages.length; q++) {
    data.questions[q].unit_agreement = percentages[q * 3];
    data.questions[q].faculty_agreement = percentages[q * 3 + 1];
    data.questions[q].university_agreement = percentages[q * 3 + 2];
  }
}

/**
 * Expand digit runs that encode three concatenated percentage values into
 * a space-separated form so the standalone-percentage regex can pick them
 * up. Handles the common cases observed in pre-2010 eValuate FUR PDFs:
 *
 *   6 digits → three 2-digit values  ("677882" → "67 78 82")
 *   9 digits → three 3-digit values  ("100100100" → "100 100 100")
 *   7 digits → mixed with one 100    (split tried in the three positions)
 *   8 digits → mixed with two 100s   (split tried in the three positions)
 *
 * Every split is sanity-checked: each part must be 0..100, otherwise the
 * run is left untouched (it isn't a percentage triple). Order of the
 * substitutions matters — handle 9-digit before 6-digit before mixed
 * lengths so longer runs aren't fragmented by shorter patterns.
 *
 * Exported for unit testing; safe to call on any text.
 */
export function expandConcatenatedPercentageTriples(text: string): string {
  // 9-digit: three 3-digit values. Only fires when all three are ≤ 100
  // (so a stray 9-digit number like a phone won't be reshaped).
  text = text.replace(/(?<!\d)(\d{9})(?!\d)/g, (m, d) => {
    const a = parseInt(d.slice(0, 3), 10);
    const b = parseInt(d.slice(3, 6), 10);
    const c = parseInt(d.slice(6, 9), 10);
    return a <= 100 && b <= 100 && c <= 100 ? `${a} ${b} ${c}` : m;
  });

  // 8-digit: 100 + 100 + 2-digit, or 100 + 2-digit + 100, or 2-digit + 100 + 100.
  // Probe in that order; first match wins per run.
  text = text.replace(/(?<!\d)100100(\d{2})(?!\d)/g, '100 100 $1');
  text = text.replace(/(?<!\d)100(\d{2})100(?!\d)/g, '100 $1 100');
  text = text.replace(/(?<!\d)(\d{2})100100(?!\d)/g, '$1 100 100');

  // 7-digit: 100 + 2-digit + 2-digit, or 2-digit + 100 + 2-digit, or 2-digit + 2-digit + 100.
  text = text.replace(/(?<!\d)100(\d{2})(\d{2})(?!\d)/g, '100 $1 $2');
  text = text.replace(/(?<!\d)(\d{2})100(\d{2})(?!\d)/g, '$1 100 $2');
  text = text.replace(/(?<!\d)(\d{2})(\d{2})100(?!\d)/g, '$1 $2 100');

  // 6-digit: three 2-digit values. Lowest-priority; runs at the end so
  // longer runs were handled first.
  text = text.replace(/(?<!\d)(\d{6})(?!\d)/g, (m, d) => {
    const a = parseInt(d.slice(0, 2), 10);
    const b = parseInt(d.slice(2, 4), 10);
    const c = parseInt(d.slice(4, 6), 10);
    // All values 0..99 by construction (2 digits each); the additional
    // <=100 check is implicit.
    return `${a} ${b} ${c}`;
  });

  return text;
}

function extractQualitative(text: string, data: EvaluateSurveyData) {
  // The last page has two prompts in turn. Find each, then split the
  // text BETWEEN them (or until end-of-document) into dash-led comments.
  //
  // Format:
  //   Please comment on the most helpful aspects of '<UnitName>'.
  //   - <comment 1, possibly multi-line>
  //   - <comment 2>
  //   Please comment on how you think '<UnitName>' might be improved.
  //   - <comment>
  //   Full Unit Report for ... Page N of N

  const helpfulRe = /Please\s+comment\s+on\s+the\s+most\s+helpful\s+aspects[^.]*\.?/i;
  const improvedRe = /Please\s+comment\s+on\s+how\s+you\s+think[^.]*?might\s+be\s+improved\.?/i;

  const helpfulMatch = helpfulRe.exec(text);
  const improvedMatch = improvedRe.exec(text);

  if (helpfulMatch) {
    const sectionStart = helpfulMatch.index + helpfulMatch[0].length;
    const sectionEnd = improvedMatch
      ? improvedMatch.index
      : text.length;
    data.qualitative.most_helpful = splitDashComments(text.slice(sectionStart, sectionEnd));
  }

  if (improvedMatch) {
    const sectionStart = improvedMatch.index + improvedMatch[0].length;
    // Stop at the footer "Full Unit Report for ... Page N of N" or end.
    const footerRe = /Full\s+Unit\s+Report\s+for/i;
    const footerMatch = footerRe.exec(text.slice(sectionStart));
    const sectionEnd = footerMatch ? sectionStart + footerMatch.index : text.length;
    data.qualitative.improvements = splitDashComments(text.slice(sectionStart, sectionEnd));
  }
}

function splitDashComments(block: string): string[] {
  // Each comment starts with "- " (dash + space) and continues until the
  // next dash or end of block. Comments can span multiple lines (the PDF
  // text extraction will already have joined them with single spaces from
  // our pagerender).
  const dashSplit = block
    .split(/\s+-\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // The first split chunk is usually whitespace/junk before the first dash;
  // drop empties or anything shorter than ~5 chars (unlikely to be a real
  // comment).
  return dashSplit
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => c.length >= 5);
}
