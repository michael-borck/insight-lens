// The Promotion module facade. Given a unit code or filters, it produces a Promotion Suggestion
// report. Analysis (querying + ACF evidence) and report generation/formatting are internal steps;
// callers pass identifiers, never rich objects. See CONTEXT.md ("Promotion module") and ADR (C4).
import {
  analyzeUnitsForPromotion,
  getHighPerformingUnits,
  PromotionAnalysisFilters,
  UnitPromotionData,
} from './promotionAnalyzer';
import {
  generatePromotionReport,
  generateOverallSummaryReport,
} from './promotionGenerator';
import {
  formatReportAsHTML,
  formatReportAsText,
  formatSummaryAsHTML,
  formatSummaryAsText,
} from './promotionFormatters';

export { getHighPerformingUnits } from './promotionAnalyzer';
export type { PromotionAnalysisFilters, UnitPromotionData } from './promotionAnalyzer';

/** The candidate units for the selection list. */
export async function findPromotionCandidates(
  filters: PromotionAnalysisFilters = {},
): Promise<UnitPromotionData[]> {
  return analyzeUnitsForPromotion(filters);
}

/** Build one unit's report, re-deriving its analysis from the unit code (no object round-trips). */
export async function buildPromotionReport(unitCode: string, filters: PromotionAnalysisFilters = {}) {
  const units = await analyzeUnitsForPromotion({ ...filters, unitCodes: [unitCode] });
  if (units.length === 0) {
    throw new Error(`No survey data found for unit ${unitCode}`);
  }
  const report = generatePromotionReport(units[0]);
  return { report, html: formatReportAsHTML(report), text: formatReportAsText(report) };
}

/** Build the cross-unit summary, re-deriving the candidates from the filters. */
export async function buildPromotionSummary(filters: PromotionAnalysisFilters = {}) {
  const units = await analyzeUnitsForPromotion(filters);
  const summary = generateOverallSummaryReport(units);
  return { summary, html: formatSummaryAsHTML(summary), text: formatSummaryAsText(summary) };
}

/**
 * Content for an export, re-derived from identifiers so no report content round-trips through the
 * renderer. `target` is a unit code, or 'summary'. PDF exports use the HTML source.
 */
export async function buildExportContent(
  target: string,
  format: 'pdf' | 'html' | 'text',
  filters: PromotionAnalysisFilters = {},
): Promise<string> {
  const wantHtml = format !== 'text';
  if (target === 'summary') {
    const { html, text } = await buildPromotionSummary(filters);
    return wantHtml ? html : text;
  }
  const { html, text } = await buildPromotionReport(target, filters);
  return wantHtml ? html : text;
}
