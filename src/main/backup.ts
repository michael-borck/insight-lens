// Pure database-backup helpers — no Electron imports so they stay unit-testable.
// The IPC layer (src/main/ipc/database.ts) owns dialogs and paths; this module
// owns the actual copy/prune mechanics.
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

/**
 * Snapshot a live SQLite database to `targetPath` using `VACUUM INTO`.
 * VACUUM INTO produces a clean, consistent copy and works while the
 * connection is open — but it refuses to write over an existing file,
 * so any existing target is unlinked first (the caller's save dialog
 * has already confirmed the overwrite).
 */
export function backupDatabaseTo(db: DatabaseSync, targetPath: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  db.prepare('VACUUM INTO ?').run(targetPath);
}

/**
 * Keep only the `keep` newest backup files (by mtime) in `dir`; delete the rest.
 * Only touches `.db` files. Missing directory is a no-op.
 */
export function pruneBackups(dir: string, keep: number): void {
  if (!fs.existsSync(dir)) return;
  const backups = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.db'))
    .map((name) => {
      const fullPath = path.join(dir, name);
      return { fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const stale of backups.slice(keep)) {
    fs.unlinkSync(stale.fullPath);
  }
}
