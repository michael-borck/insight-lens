import { ipcMain } from 'electron';
import log from 'electron-log';
import path from 'path';
import { promises as fs } from 'fs';
import type { DatabaseSync } from 'node:sqlite';
import type Store from 'electron-store';
import { getDatabase } from '../database';
import { autoBackupIfEnabled } from './database';
import { persistSurvey, persistEvaluateSurvey } from '../importer';
import { importCsv } from '../csvImporter';
import { extractFromPdf } from '../pdfExtract';
import { getPreviousSurveyComparison } from '../queries/comparison';
import type { ImportResultDetail } from '../../shared/types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Change alert for a freshly imported survey: deltas (new minus previous,
 * 1dp) against the unit's chronologically previous survey. Undefined when
 * this is the unit's first-ever survey — the UI omits the section entirely.
 */
function buildChanges(
  db: DatabaseSync,
  surveyId: number | undefined,
): ImportResultDetail['changes'] {
  if (surveyId === undefined) return undefined;
  const comparison = getPreviousSurveyComparison(db, surveyId);
  if (!comparison) return undefined;
  return {
    prevPeriod: `${comparison.previous.semester} ${comparison.previous.year}`,
    overallDelta: round1(comparison.current.overall_experience - comparison.previous.overall_experience),
    responseRateDelta: round1(comparison.current.response_rate - comparison.previous.response_rate),
  };
}

export function registerImportHandlers(store: Store) {
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
  // Files are routed by extension: .csv goes through the CSV importer (one
  // file can yield multiple detail entries, one per data row, labelled
  // "data.csv (row N)"); everything else goes through the PDF path. Insight
  // persists via persistSurvey, eValuate via persistEvaluateSurvey. All
  // importers return the same PersistResult shape, so the tally logic is
  // uniform. The per-file `format` field on each detail entry lets the UI
  // surface which instrument the row came from.
  //
  // Every successful import gets a `changes` object comparing it to the
  // unit's previous survey (see buildChanges) for the Import results UI.
  ipcMain.handle('surveys:import', async (event, filePaths: string[]) => {
    // Safety net before any rows are written (no-op unless enabled in Settings).
    autoBackupIfEnabled(store);

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
        // ── CSV route ──────────────────────────────────────────────
        if (path.extname(filePath).toLowerCase() === '.csv') {
          const text = await fs.readFile(filePath, 'utf8');
          const outcomes = importCsv(text, db, file);

          for (const outcome of outcomes) {
            const label = `${file} (row ${outcome.row})`;
            if (outcome.status === 'failed') {
              results.failed++;
              results.details.push({ file: label, status: 'failed', format: 'csv', error: outcome.error });
            } else if (outcome.status === 'duplicate') {
              results.duplicates++;
              results.details.push({
                file: label,
                status: 'duplicate',
                format: 'csv',
                unit: outcome.unit,
                period: outcome.period,
              });
            } else {
              results.success++;
              results.details.push({
                file: label,
                status: 'success',
                format: 'csv',
                unit: outcome.unit,
                period: outcome.period,
                changes: buildChanges(db, outcome.surveyId),
              });
            }
          }
          continue;
        }

        // ── PDF route ──────────────────────────────────────────────
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
            changes: buildChanges(db, outcome.surveyId),
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
