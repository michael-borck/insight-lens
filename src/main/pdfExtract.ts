// Unified PDF extraction entry point — detects format then dispatches to
// the right extractor, returning a discriminated union so callers don't
// have to know which extractor produced the result.
//
// This is the single import seam for the renderer + IPC layer. The two
// extractors (pdfExtractor for Insight, evaluateExtractor for eValuate)
// stay independent and untouched — this module is the wiring above them.

import { extractSurveyData, type SurveyData } from './pdfExtractor';
import {
  extractEvaluateData,
  type EvaluateSurveyData,
} from './evaluateExtractor';
import { detectPdfFormat, type PdfFormat } from './pdfFormatDetector';

export type { PdfFormat };

/**
 * Discriminated result. `format` is always present, even on failure, so
 * the UI can show a format-specific message ("Couldn't read your eValuate
 * report" vs a generic failure).
 */
export type ExtractResult =
  | { format: 'insight';  success: true;  data: SurveyData }
  | { format: 'evaluate'; success: true;  data: EvaluateSurveyData }
  | { format: PdfFormat;  success: false; error: string };

/**
 * Detect the PDF format then run the matching extractor. The single
 * recommended entry point for any caller that doesn't already know
 * which format the file is.
 */
export async function extractFromPdf(pdfPath: string): Promise<ExtractResult> {
  const detection = await detectPdfFormat(pdfPath);

  if (detection.format === 'unknown') {
    return {
      format: 'unknown',
      success: false,
      error:
        "Couldn't recognise this PDF as either an Insight Unit Survey Report or an eValuate Full Unit Report.",
    };
  }

  if (detection.format === 'evaluate') {
    const r = await extractEvaluateData(pdfPath);
    if (r.success && r.data) {
      return { format: 'evaluate', success: true, data: r.data };
    }
    return {
      format: 'evaluate',
      success: false,
      error: r.error ?? 'eValuate extraction returned no data.',
    };
  }

  // detection.format === 'insight'
  const r = await extractSurveyData(pdfPath);
  if (r.success && r.data) {
    return { format: 'insight', success: true, data: r.data };
  }
  return {
    format: 'insight',
    success: false,
    error: r.error ?? 'Insight extraction returned no data.',
  };
}
