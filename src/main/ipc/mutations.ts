import { ipcMain } from 'electron';
import log from 'electron-log';
import { getDatabase } from '../database';
import { deleteUnit, deleteSurvey, restoreSnapshot } from '../queries/unitDetail';
import type { DeleteSnapshot } from '../queries/unitDetail';

// Single-slot "undo last delete" buffer. Lives in the main process only —
// the renderer never sees the snapshot, just success/failure of the undo.
// A new delete overwrites the slot; a successful undo (or expiry) clears it.
let undoSlot: { snapshot: DeleteSnapshot; deletedAt: number } | null = null;
const UNDO_WINDOW_MS = 30_000;

export function registerMutationHandlers() {
  // Destructive mutations. Kept as their own IPC channels (not in the
  // runQuery registry — that's read-only-by-convention) and wrapped in
  // try/catch so the renderer gets { success, ... } either way and can
  // surface a toast rather than dying on an uncaught promise rejection.
  ipcMain.handle('unit:delete', async (event, unitCode: string) => {
    try {
      // The snapshot stays main-process-side (undo slot); only the counts
      // cross the IPC boundary — response shape is unchanged.
      const { snapshot, ...result } = deleteUnit(getDatabase(), { unitCode });
      if (snapshot) undoSlot = { snapshot, deletedAt: Date.now() };
      log.info(
        `Deleted unit ${unitCode}: ${result.surveys_deleted} surveys, ${result.comments_deleted} comments`,
      );
      return { success: true, ...result };
    } catch (error) {
      log.error(`Failed to delete unit ${unitCode}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('survey:delete', async (event, surveyId: number) => {
    try {
      const { snapshot, ...result } = deleteSurvey(getDatabase(), { surveyId });
      if (snapshot) undoSlot = { snapshot, deletedAt: Date.now() };
      log.info(
        `Deleted survey ${surveyId} (unit ${result.unit_code}): ${result.comments_deleted} comments; offering_removed=${result.offering_removed}, unit_removed=${result.unit_removed}`,
      );
      return { success: true, ...result };
    } catch (error) {
      log.error(`Failed to delete survey ${surveyId}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Undo the most recent delete by re-inserting its snapshot. Single slot,
  // 30-second window: deletes older than that (or already undone) can't be
  // restored — the user should re-import the PDF instead.
  ipcMain.handle('delete:undo', async () => {
    if (!undoSlot) {
      return { success: false, error: 'Nothing to undo.' };
    }
    if (Date.now() - undoSlot.deletedAt > UNDO_WINDOW_MS) {
      undoSlot = null;
      return { success: false, error: 'The undo window has expired. Re-import the PDF to restore the data.' };
    }
    const { snapshot } = undoSlot;
    try {
      restoreSnapshot(getDatabase(), snapshot);
      undoSlot = null;
      log.info(`Undo delete: restored ${snapshot.kind} ${snapshot.label}`);
      return { success: true, restored: snapshot.kind, label: snapshot.label };
    } catch (error) {
      log.error(`Undo delete failed for ${snapshot.kind} ${snapshot.label}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });
}
