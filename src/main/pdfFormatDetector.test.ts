// Tests for the PDF format detector.
//
// Real samples from /Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/
// are the source of truth. Tests skip themselves if that folder isn't
// present (e.g. running on someone else's machine).

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectPdfFormat } from './pdfFormatDetector';

const EVALUATE_DIR =
  '/Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/eValuate-reports';
const INSIGHT_DIR =
  '/Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/insight-unit-surveys';

const evaluateAvailable = fs.existsSync(EVALUATE_DIR);
const insightAvailable = fs.existsSync(INSIGHT_DIR);

const evaluateSamples = evaluateAvailable
  ? fs.readdirSync(EVALUATE_DIR).filter((f) => f.startsWith('FUR_Report-') && f.endsWith('.pdf'))
  : [];
const insightSamples = insightAvailable
  ? fs
      .readdirSync(INSIGHT_DIR)
      .filter((f) => f.startsWith('U1 Unit Survey Report') && f.endsWith('.pdf'))
  : [];

describe.skipIf(!evaluateAvailable)('detectPdfFormat — eValuate corpus', () => {
  it.each(evaluateSamples)('detects %s as eValuate (content)', async (filename) => {
    const result = await detectPdfFormat(path.join(EVALUATE_DIR, filename));
    expect(result.format).toBe('evaluate');
    // The content sniff should win — these PDFs all carry the
    // "e VALUate" / "Full Unit Report for" markers on page 1.
    expect(result.confidence).toBe('content');
  });
});

describe.skipIf(!insightAvailable)('detectPdfFormat — Insight corpus', () => {
  it.each(insightSamples)('detects %s as Insight (content)', async (filename) => {
    const result = await detectPdfFormat(path.join(INSIGHT_DIR, filename));
    expect(result.format).toBe('insight');
    expect(result.confidence).toBe('content');
  });
});

describe('detectPdfFormat — unknown / fallback paths', () => {
  it('returns unknown for a non-PDF file with no recognised filename', async () => {
    // Use a small text file as a stand-in. pdf-parse will fail; detection
    // should fall through to filename and then to unknown.
    const tmp = path.join(__dirname, '_detector-test-tmp.txt');
    fs.writeFileSync(tmp, 'not a pdf');
    try {
      const result = await detectPdfFormat(tmp);
      expect(result.format).toBe('unknown');
      expect(result.confidence).toBe('unknown');
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('falls back to filename for a non-PDF named FUR_Report-…', async () => {
    // Non-PDF content + eValuate filename → falls through pdf-parse,
    // matches the filename pattern, returns 'evaluate' with confidence
    // 'filename'.
    const tmp = path.join(__dirname, 'FUR_Report-fake.pdf');
    fs.writeFileSync(tmp, 'definitely not a pdf');
    try {
      const result = await detectPdfFormat(tmp);
      expect(result.format).toBe('evaluate');
      expect(result.confidence).toBe('filename');
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('falls back to filename for a non-PDF named U1 Unit Survey Report…', async () => {
    const tmp = path.join(__dirname, 'U1 Unit Survey Report - fake.pdf');
    fs.writeFileSync(tmp, 'definitely not a pdf');
    try {
      const result = await detectPdfFormat(tmp);
      expect(result.format).toBe('insight');
      expect(result.confidence).toBe('filename');
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
