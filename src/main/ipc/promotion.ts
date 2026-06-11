import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import * as promotion from '../promotion';
import type { PromotionAnalysisFilters } from '../promotion';

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

      // Show save dialog
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: format === 'pdf'
          ? [{ name: 'PDF Files', extensions: ['pdf'] }]
          : format === 'html'
          ? [{ name: 'HTML Files', extensions: ['html'] }]
          : [{ name: 'Text Files', extensions: ['txt'] }]
      });

      if (!result.canceled && result.filePath) {
        if (format === 'pdf') {
          // For PDF, render the HTML in a hidden window and use Electron's
          // built-in printToPDF (no external dependency needed).
          const win = new BrowserWindow({
            show: false,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
            },
          });
          let tempHtmlPath: string | null = null;
          try {
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(content);
            // Very large documents can exceed Chromium's data-URL navigation
            // limits, so fall back to a temp file for big content.
            if (dataUrl.length <= 1_500_000) {
              await win.loadURL(dataUrl);
            } else {
              tempHtmlPath = path.join(os.tmpdir(), `insightlens-export-${Date.now()}.html`);
              await fs.writeFile(tempHtmlPath, content, 'utf8');
              await win.loadFile(tempHtmlPath);
            }
            const pdfBuffer = await win.webContents.printToPDF({ pageSize: 'A4' });
            await fs.writeFile(result.filePath, pdfBuffer);
          } finally {
            win.destroy();
            if (tempHtmlPath) {
              await fs.unlink(tempHtmlPath).catch(() => {});
            }
          }
        } else {
          // For HTML and text, write directly
          await fs.writeFile(result.filePath, content, 'utf8');
        }

        return { success: true, path: result.filePath };
      }

      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      log.error('Export error:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
