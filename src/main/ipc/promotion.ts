import { ipcMain, app, dialog } from 'electron';
import log from 'electron-log';
import path from 'path';
import { promises as fs } from 'fs';
import * as promotion from '../promotion';
import type { PromotionAnalysisFilters } from '../promotion';
import { exportHtmlToPdf } from './pdfExport';

export function registerPromotionHandlers() {
  // Promotion analysis handlers — identifier-based; the Promotion module owns the rich objects.
  ipcMain.handle('promotion:analyzeUnits', async (event, filters: PromotionAnalysisFilters) => {
    try {
      return { success: true, data: await promotion.findPromotionCandidates(filters) };
    } catch (error) {
      log.error('Promotion analysis error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:getHighPerformers', async (event, minSatisfaction: number = 80) => {
    try {
      return { success: true, data: await promotion.getHighPerformingUnits(minSatisfaction) };
    } catch (error) {
      log.error('Failed to get high performing units:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateReport', async (event, unitCode: string, filters: PromotionAnalysisFilters) => {
    try {
      return { success: true, data: await promotion.buildPromotionReport(unitCode, filters) };
    } catch (error) {
      log.error('Report generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateSummary', async (event, filters: PromotionAnalysisFilters) => {
    try {
      return { success: true, data: await promotion.buildPromotionSummary(filters) };
    } catch (error) {
      log.error('Summary generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:exportReport', async (event, target: string, format: 'pdf' | 'html' | 'text', filters: PromotionAnalysisFilters, filename: string) => {
    try {
      const content = await promotion.buildExportContent(target, format, filters);

      if (format === 'pdf') {
        // Shared helper: shows the save dialog, renders the HTML in a hidden
        // window and prints it to PDF. Same result envelope as below.
        return await exportHtmlToPdf(content, filename);
      }

      // Show save dialog
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: format === 'html'
          ? [{ name: 'HTML Files', extensions: ['html'] }]
          : [{ name: 'Text Files', extensions: ['txt'] }]
      });

      if (!result.canceled && result.filePath) {
        // For HTML and text, write directly
        await fs.writeFile(result.filePath, content, 'utf8');
        return { success: true, path: result.filePath };
      }

      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      log.error('Export error:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
