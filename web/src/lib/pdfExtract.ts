// Client-side survey PDF extraction.
//
// Ports the desktop app's text-regex extractor (src/main/pdfExtractor.ts) to
// run in the browser. The desktop uses Node's pdf-parse; here pdfjs-dist reads
// the same page text, then the identical regex functions parse it. Everything
// stays in the visitor's browser — no upload, matching the app's privacy story.

import * as pdfjsLib from 'pdfjs-dist';
// Vite ?url import gives the worker script a hashed asset URL.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PercentageAgreements, SurveyData } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const CATEGORY_KEYS: readonly ('engagement' | 'resources' | 'support' | 'assessments' | 'expectations' | 'overall')[] = [
  'engagement', 'resources', 'support', 'assessments', 'expectations', 'overall',
];
const CATEGORY_LABELS = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall'];

function emptySurvey(): SurveyData {
  return {
    unit_info: {},
    response_stats: {},
    percentage_agreement: {},
    benchmarks: [],
    detailed_results: {},
    comments: [],
  };
}

/** Extract the full text of a survey PDF, one string per page (1-based→0 index). */
async function readPages(data: Uint8Array): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      // TextItem carries .str; TextMarkedContent does not — the `in` guard narrows.
      if ('str' in item) text += item.str + ' ';
    }
    pages.push(text);
  }
  await pdf.destroy();
  return pages;
}

function extractUnitInfo(pageText: string, results: SurveyData) {
  const unitMatch = pageText.match(/([A-Z]{4}\d+)\s+(.*?)\s+-\s+Semester/);
  if (unitMatch) {
    results.unit_info.unit_code = unitMatch[1];
    results.unit_info.unit_name = unitMatch[2].trim();
  }

  let campusModeMatch = pageText.match(/- ([^-]+?)\s+Campus\s*[-–]\s*(Internal|Online)/i);
  if (campusModeMatch) {
    results.unit_info.campus_name = campusModeMatch[1].trim();
    results.unit_info.mode = campusModeMatch[2].trim();
  } else {
    campusModeMatch = pageText.match(/- (Curtin\s+\w+)\s*[-–]\s*(Internal|Online)/i);
    if (campusModeMatch) {
      results.unit_info.campus_name = campusModeMatch[1].trim();
      results.unit_info.mode = campusModeMatch[2].trim();
    }
  }

  const termYearMatch = pageText.match(/(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})/i);
  if (termYearMatch) {
    results.unit_info.term = termYearMatch[1].trim();
    results.unit_info.year = termYearMatch[2].trim();
  }
}

function extractResponseStats(pageText: string, results: SurveyData) {
  const statsMatch = pageText.match(/# Enrolments.*?\(N\).*?# Responses.*?Response Rate\s*(\d+)\s+(\d+)\s+(\d+\.\d+)/s);
  if (statsMatch) {
    results.response_stats.enrollments = parseInt(statsMatch[1], 10);
    results.response_stats.responses = parseInt(statsMatch[2], 10);
    results.response_stats.response_rate = parseFloat(statsMatch[3]);
  }
}

const AGREEMENT_METRICS: [label: string, key: keyof PercentageAgreements][] = [
  ['I was engaged by the learning activities', 'engagement'],
  ['The resources provided helped me to learn', 'resources'],
  ['My learning was supported', 'support'],
  ['Assessments helped me to demonstrate my learning', 'assessments'],
  ['I knew what was expected of me', 'expectations'],
  ['Overall, this unit was a worthwhile experience', 'overall'],
];

function extractPercentageAgreement(pageText: string, results: SurveyData) {
  for (const [metricText, key] of AGREEMENT_METRICS) {
    const escaped = metricText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = pageText.match(new RegExp(escaped + '\\s+(\\d+\\.\\d+)%'));
    if (match) results.percentage_agreement[key] = parseFloat(match[1]);
  }
}

function extractBenchmarks(pageText: string, results: SurveyData) {
  const unitCode = results.unit_info.unit_code ?? '';
  const levelPatterns: [level: string, re: RegExp][] = [
    ['Overall', /Overall/],
    [`Unit - ${unitCode}`, new RegExp(`Unit\\s*-\\s*${unitCode}`)],
    ['School', /School\s*-\s*School of/],
    ['Faculty', /Faculty\s*-\s*Faculty of/],
    ['Curtin', /Curtin/],
  ];

  const overallSource = levelPatterns[0][1].source;
  for (const [level, pattern] of levelPatterns) {
    const slice = pageText.match(
      new RegExp(`(${pattern.source}.*?)(?=(?:${overallSource}|$))`, 'si'),
    );
    if (!slice) continue;
    const levelText = slice[1];
    const percentages = [...levelText.matchAll(/(\d+\.\d+)%/g)].map((m) => m[1]);
    if (percentages.length < 6) continue;

    const agreement: PercentageAgreements = {};
    CATEGORY_LABELS.forEach((_, i) => {
      if (i < percentages.length) agreement[CATEGORY_KEYS[i]] = parseFloat(percentages[i]);
    });
    results.benchmarks.push({ level, agreement });
  }
}

function extractComments(pageText: string, results: SurveyData) {
  const commentsMatch = pageText.match(
    /What are the main reasons for your rating.*?Comments\s*(.*?)(?:This report may contain|$)/si,
  );
  if (!commentsMatch) return;
  const commentsText = commentsMatch[1].trim();

  let comments = commentsText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (comments.length < 3 && commentsText.length > 100) {
    const sentenceBreaks = commentsText.split(/\.(?:\s+)(?=[A-Z])/);
    if (sentenceBreaks.length > comments.length) {
      comments = sentenceBreaks
        .map((s) => {
          const trimmed = s.trim();
          return trimmed && !trimmed.endsWith('.') ? trimmed + '.' : trimmed;
        })
        .filter((s) => s.length > 10);
    }
  }

  for (const comment of comments) {
    const cleaned = comment.trim();
    if (
      cleaned.length > 10 &&
      !/^Comments\s*$/i.test(cleaned) &&
      !cleaned.includes('This report may contain')
    ) {
      results.comments.push(cleaned);
    }
  }
}

export interface ExtractResult {
  success: boolean;
  data?: SurveyData;
  error?: string;
}

/** Parse an eVALUate-style survey PDF entirely in the browser. */
export async function extractSurvey(file: File): Promise<ExtractResult> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const pages = await readPages(buf);

    const results = emptySurvey();
    if (pages[0]) extractUnitInfo(pages[0], results);
    if (pages[2]) extractResponseStats(pages[2], results);
    if (pages[2]) extractPercentageAgreement(pages[2], results);
    if (pages[3]) extractBenchmarks(pages[3], results);
    if (pages[7]) extractComments(pages[7], results);

    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to read PDF' };
  }
}
