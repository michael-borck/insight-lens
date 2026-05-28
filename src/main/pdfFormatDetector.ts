// PDF format detector — figures out whether a survey PDF is the modern
// Insight "Unit Survey Report" or the legacy eValuate "Full Unit Report"
// so the import pipeline can route to the right extractor.
//
// Detection strategy (in order):
//   1. Content sniff — parse just the first page and look for unambiguous
//      markers in the document text. This is the primary signal because
//      it's robust against filename changes.
//   2. Filename fallback — if the content is ambiguous (or parsing fails),
//      fall back to the well-known filename prefixes:
//        FUR_Report-*               → eValuate
//        U1 Unit Survey Report*     → Insight
//
// Content-detection markers are chosen to be unique to each format and
// appear on page 1 of every sample we've seen (eValuate's "e VALUate" /
// "Full Unit Report" header and Insight's "Unit Survey Report" title).

import * as fs from 'fs';
import * as path from 'path';

const pdfParse = require('pdf-parse');

export type PdfFormat = 'insight' | 'evaluate' | 'unknown';

export interface DetectionResult {
  format: PdfFormat;
  /** Where the verdict came from — useful for diagnostics + UI hints. */
  confidence: 'content' | 'filename' | 'unknown';
}

// Patterns are case-insensitive and tolerant of the embedded space
// eValuate uses in its display name ("e VALUate").
const EVALUATE_CONTENT_MARKERS: RegExp[] = [
  /e\s*VALUate/i,
  /Full\s+Unit\s+Report\s+for/i,
];

const INSIGHT_CONTENT_MARKERS: RegExp[] = [
  /Unit\s+Survey\s+Report/i,
  /Insight\s+Unit\s+Survey/i,
];

/**
 * Detect which survey format a PDF is. Reads at most the first page for
 * the content sniff so it stays cheap.
 *
 * Returns 'unknown' when neither content nor filename matches — callers
 * should surface that to the user as "unsupported PDF format" rather than
 * trying to parse it.
 */
export async function detectPdfFormat(pdfPath: string): Promise<DetectionResult> {
  // ── Content sniff (primary) ─────────────────────────────────────────
  try {
    const buffer = fs.readFileSync(pdfPath);
    // `max: 1` limits parsing to the first page — fast for big PDFs.
    const data = await pdfParse(buffer, { max: 1 });
    const firstPageText: string = data.text || '';

    if (EVALUATE_CONTENT_MARKERS.some((re) => re.test(firstPageText))) {
      return { format: 'evaluate', confidence: 'content' };
    }
    if (INSIGHT_CONTENT_MARKERS.some((re) => re.test(firstPageText))) {
      return { format: 'insight', confidence: 'content' };
    }
  } catch {
    // Fall through to filename — a corrupt or non-PDF file might still
    // have a meaningful name. We don't surface the parse error here
    // because the extractor will give a clearer error later.
  }

  // ── Filename fallback ──────────────────────────────────────────────
  const filename = path.basename(pdfPath);

  if (/^FUR_Report[-_]/i.test(filename)) {
    return { format: 'evaluate', confidence: 'filename' };
  }
  if (/^U1\s+Unit\s+Survey\s+Report/i.test(filename)) {
    return { format: 'insight', confidence: 'filename' };
  }

  return { format: 'unknown', confidence: 'unknown' };
}
