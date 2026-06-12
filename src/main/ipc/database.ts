import { ipcMain, app, dialog } from 'electron';
import log from 'electron-log';
import path from 'path';
import Store from 'electron-store';
import { getDatabase } from '../database';
import { backupDatabaseTo, pruneBackups } from '../backup';
import type { ExportReportResult } from '../../shared/types';

const AUTO_BACKUP_KEEP = 5;

/**
 * Write an automatic safety backup to <userData>/backups/insightlens-auto-<timestamp>.db
 * when the 'autoBackupBeforeImport' setting is enabled, pruning the directory
 * to the AUTO_BACKUP_KEEP newest copies. Never throws — a failed backup must
 * not block an import (it is logged instead).
 */
export function autoBackupIfEnabled(store: Store): void {
  try {
    if (!store.get('autoBackupBeforeImport', false)) return;
    const backupDir = path.join(app.getPath('userData'), 'backups');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupDatabaseTo(getDatabase(), path.join(backupDir, `insightlens-auto-${stamp}.db`));
    pruneBackups(backupDir, AUTO_BACKUP_KEEP);
  } catch (error) {
    log.warn('Auto-backup before import failed (continuing without it):', error);
  }
}

export function registerDatabaseHandlers(_store: Store) {
  // Manual backup: save dialog, then a consistent snapshot of the live
  // connection via VACUUM INTO (works while the database is open).
  ipcMain.handle('db:backup', async (): Promise<ExportReportResult> => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await dialog.showSaveDialog({
        title: 'Back up database',
        defaultPath: path.join(app.getPath('documents'), `insightlens-backup-${today}.db`),
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Backup cancelled' };
      }

      // The save dialog already confirmed any overwrite; backupDatabaseTo
      // unlinks an existing target because VACUUM INTO refuses to.
      backupDatabaseTo(getDatabase(), result.filePath);
      log.info('Database backed up to', result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      log.error('Database backup failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
