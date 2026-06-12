// Shared HTML → PDF export helper. Renders an HTML string in a hidden
// BrowserWindow and uses Electron's built-in printToPDF (no external
// dependency), after asking the user where to save via the system dialog.
// Used by the promotion export and the unit report export.
import { app, dialog, BrowserWindow } from 'electron';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import type { ExportReportResult } from '../../shared/types';

/**
 * Show a save dialog (defaulting to the user's Documents folder), render
 * `html` to a PDF, and write it to the chosen path.
 *
 * Returns { success: true, path } on success, or { success: false, error }
 * — with error 'Export cancelled' when the user dismissed the dialog, so
 * callers can treat cancellation as a non-error.
 */
export async function exportHtmlToPdf(
  html: string,
  defaultFilename: string,
): Promise<ExportReportResult> {
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('documents'), defaultFilename),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Export cancelled' };
  }

  // Render the HTML in a hidden window and print it to PDF.
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
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    // Very large documents can exceed Chromium's data-URL navigation
    // limits, so fall back to a temp file for big content.
    if (dataUrl.length <= 1_500_000) {
      await win.loadURL(dataUrl);
    } else {
      tempHtmlPath = path.join(os.tmpdir(), `insightlens-export-${Date.now()}.html`);
      await fs.writeFile(tempHtmlPath, html, 'utf8');
      await win.loadFile(tempHtmlPath);
    }
    const pdfBuffer = await win.webContents.printToPDF({ pageSize: 'A4' });
    await fs.writeFile(result.filePath, pdfBuffer);
    return { success: true, path: result.filePath };
  } finally {
    win.destroy();
    if (tempHtmlPath) {
      await fs.unlink(tempHtmlPath).catch(() => {});
    }
  }
}
