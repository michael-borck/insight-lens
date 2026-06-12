import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { backupDatabaseTo, pruneBackups } from './backup';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insightlens-backup-test-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('backupDatabaseTo', () => {
  it('copies a live database via VACUUM INTO and the copy contains the data', () => {
    const db = new DatabaseSync(path.join(dir, 'live.db'));
    db.exec('CREATE TABLE unit (unit_code TEXT PRIMARY KEY, unit_name TEXT)');
    db.prepare('INSERT INTO unit (unit_code, unit_name) VALUES (?, ?)').run('ISYS1000', 'Intro');

    const target = path.join(dir, 'copy.db');
    backupDatabaseTo(db, target);
    db.close();

    const copy = new DatabaseSync(target, { readOnly: true });
    const rows = copy.prepare('SELECT unit_code, unit_name FROM unit').all();
    copy.close();
    expect(rows).toEqual([{ unit_code: 'ISYS1000', unit_name: 'Intro' }]);
  });

  it('overwrites an existing target file (VACUUM INTO alone would refuse)', () => {
    const db = new DatabaseSync(path.join(dir, 'live.db'));
    db.exec('CREATE TABLE t (v INTEGER)');
    db.prepare('INSERT INTO t (v) VALUES (?)').run(42);

    const target = path.join(dir, 'copy.db');
    fs.writeFileSync(target, 'stale not-a-database content');

    backupDatabaseTo(db, target);
    db.close();

    const copy = new DatabaseSync(target, { readOnly: true });
    expect(copy.prepare('SELECT v FROM t').all()).toEqual([{ v: 42 }]);
    copy.close();
  });

  it('creates the target directory when missing', () => {
    const db = new DatabaseSync(path.join(dir, 'live.db'));
    db.exec('CREATE TABLE t (v INTEGER)');

    const target = path.join(dir, 'nested', 'deeper', 'copy.db');
    backupDatabaseTo(db, target);
    db.close();

    expect(fs.existsSync(target)).toBe(true);
  });
});

describe('pruneBackups', () => {
  it('keeps only the newest N .db files and ignores other files', () => {
    const base = Date.now() / 1000 - 1000;
    for (let i = 0; i < 7; i++) {
      const file = path.join(dir, `insightlens-auto-${i}.db`);
      fs.writeFileSync(file, `backup ${i}`);
      // Older index ⇒ older mtime, so files 2..6 are the five newest.
      fs.utimesSync(file, base + i, base + i);
    }
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'keep me');

    pruneBackups(dir, 5);

    const remaining = fs.readdirSync(dir).sort();
    expect(remaining).toEqual([
      'insightlens-auto-2.db',
      'insightlens-auto-3.db',
      'insightlens-auto-4.db',
      'insightlens-auto-5.db',
      'insightlens-auto-6.db',
      'notes.txt',
    ]);
  });

  it('is a no-op for a missing directory', () => {
    expect(() => pruneBackups(path.join(dir, 'does-not-exist'), 5)).not.toThrow();
  });
});
