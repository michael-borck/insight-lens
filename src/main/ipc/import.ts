import { ipcMain } from 'electron';
import log from 'electron-log';
import path from 'path';
import { getDatabase } from '../database';
import { persistSurvey, persistEvaluateSurvey } from '../importer';
import { extractFromPdf } from '../pdfExtract';
import type { ImportResultDetail } from '../../shared/types';

export function registerImportHandlers() {
  // PDF extraction handler — uses the unified dispatcher so it returns
  // a discriminated result: { format: 'insight' | 'evaluate' | 'unknown',
  // success, data?, error? }. Renderer code that previously assumed the
  // Insight shape should branch on `format` before reading `data`.
  ipcMain.handle('pdf:extract', async (event, filePath: string) => {
    try {
      const result = await extractFromPdf(filePath);
      return { success: true, data: result };
    } catch (error) {
      log.error('PDF extraction error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Import surveys handler — loops over files + tallies; the Importer owns each survey.
  //
  // Phase 3: both formats persist. Insight via persistSurvey, eValuate via
  // persistEvaluateSurvey. Both functions return the same PersistResult
  // shape, so the tally logic is uniform. The per-file `format` field on
  // each detail entry lets the UI surface which instrument the row came
  // from.
  ipcMain.handle('surveys:import', async (event, filePaths: string[]) => {
    const results = {
      success: 0,
      duplicates: 0,
      failed: 0,
      details: [] as ImportResultDetail[],
    };

    const db = getDatabase();

    for (const filePath of filePaths) {
      const file = path.basename(filePath);
      try {
        const extractResult = await extractFromPdf(filePath);

        if (!extractResult.success) {
          results.failed++;
          results.details.push({
            file,
            status: 'failed',
            format: extractResult.format,
            error: extractResult.error,
          });
          continue;
        }

        // Persist via the format-appropriate importer. Both return
        // PersistResult so the rest of this branch is uniform.
        const outcome =
          extractResult.format === 'evaluate'
            ? persistEvaluateSurvey(extractResult.data, db, file)
            : persistSurvey(extractResult.data, db, file);

        if (outcome.status === 'duplicate') {
          results.duplicates++;
          results.details.push({
            file,
            status: 'duplicate',
            format: extractResult.format,
            unit: outcome.unit,
            period: outcome.period,
          });
        } else {
          results.success++;
          results.details.push({
            file,
            status: 'success',
            format: extractResult.format,
            unit: outcome.unit,
            period: outcome.period,
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({ file, status: 'failed', error: (error as Error).message });
      }
    }

    return results;
  });
}
