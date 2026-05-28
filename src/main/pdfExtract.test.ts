// Tests for the unified PDF extraction dispatcher. Exercises both
// real-sample paths (eValuate + Insight) via the dispatcher entry point,
// and the unknown-format fallback.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractFromPdf } from './pdfExtract';

const EVALUATE_DIR =
  '/Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/eValuate-reports';
const INSIGHT_DIR =
  '/Users/michael/Projects/promotion_appplication/insight-evaluate-feedback/insight-unit-surveys';

const evaluateAvailable = fs.existsSync(EVALUATE_DIR);
const insightAvailable = fs.existsSync(INSIGHT_DIR);

const evaluateAnchor = 'FUR_Report-ISYS6011-s1-2019.pdf';
const insightAnchor = insightAvailable
  ? fs
      .readdirSync(INSIGHT_DIR)
      .find((f) => f.startsWith('U1 Unit Survey Report') && f.endsWith('.pdf'))
  : undefined;

describe('extractFromPdf — discriminated dispatch', () => {
  it.skipIf(!evaluateAvailable)('routes an eValuate PDF and returns the eValuate shape', async () => {
    const result = await extractFromPdf(path.join(EVALUATE_DIR, evaluateAnchor));
    // TypeScript only narrows the discriminated-union 'data' field once
    // BOTH 'success' AND 'format' have been checked — both are part of
    // the discriminator on ExtractResult.
    expect(result.success).toBe(true);
    expect(result.format).toBe('evaluate');
    if (result.success && result.format === 'evaluate') {
      expect(result.data.format).toBe('evaluate');
      expect(result.data.unit_info.unit_code).toBe('ISYS6011');
      expect(result.data.questions).toHaveLength(11);
    }
  });

  it.skipIf(!insightAvailable || !insightAnchor)('routes an Insight PDF and returns the Insight shape', async () => {
    const result = await extractFromPdf(path.join(INSIGHT_DIR, insightAnchor!));
    expect(result.success).toBe(true);
    expect(result.format).toBe('insight');
    if (result.success && result.format === 'insight') {
      // Insight data shape: SurveyData with unit_info + percentage_agreement.
      expect(result.data.unit_info).toBeDefined();
      expect(result.data.percentage_agreement).toBeDefined();
    }
  });

  it('returns format=unknown + a helpful error for an unrecognised file', async () => {
    const tmp = path.join(__dirname, '_extract-test-unknown.pdf');
    // Non-PDF content + no recognised filename pattern.
    fs.writeFileSync(tmp.replace(/\.pdf$/, '.txt'), 'not a survey');
    const tmpTxt = tmp.replace(/\.pdf$/, '.txt');
    try {
      const result = await extractFromPdf(tmpTxt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.format).toBe('unknown');
        expect(result.error).toMatch(/recognise|Insight|eValuate/i);
      }
    } finally {
      fs.unlinkSync(tmpTxt);
    }
  });
});
