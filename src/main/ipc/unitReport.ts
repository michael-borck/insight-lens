import { ipcMain } from 'electron';
import log from 'electron-log';
import { getDatabase } from '../database';
import { buildUnitReportHtml } from '../unitReport';
import { exportHtmlToPdf } from './pdfExport';
import type { ExportReportResult } from '../../shared/types';

export function registerUnitReportHandlers() {
  // One-click "Export Unit Report (PDF)" from the UnitDetail page. Builds
  // the HTML here (new Date() lives at the IPC boundary so the builder
  // stays pure) and hands it to the shared HTML→PDF export helper.
  ipcMain.handle(
    'unit:exportReport',
    async (event, unitCode: string): Promise<ExportReportResult> => {
      try {
        const generatedDate = new Date();
        const html = buildUnitReportHtml(getDatabase(), unitCode, generatedDate);
        const dateStr = generatedDate.toISOString().slice(0, 10);
        return await exportHtmlToPdf(html, `InsightLens-Report-${unitCode}-${dateStr}.pdf`);
      } catch (error) {
        log.error(`Unit report export error for ${unitCode}:`, error);
        return { success: false, error: (error as Error).message };
      }
    },
  );
}
