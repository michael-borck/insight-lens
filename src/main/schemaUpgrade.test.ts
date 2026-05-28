// Tests for the unit_offering.mode CHECK constraint upgrade
// (upgradeUnitOfferingModeCheck inside createSchema).
//
// Verifies: idempotence, data preservation, no-op on already-upgraded DBs,
// no-op on fresh DBs.

import { describe, it, expect } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';

function makeDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * Build a database with the OLD schema (CHECK admits only Internal/Online),
 * seed a single offering, and return the connection. Mirrors what an
 * existing user's DB looks like before they update the app.
 */
function makeOldDb(): any {
  const db = makeDb();
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE unit (
      unit_code TEXT PRIMARY KEY,
      unit_name TEXT NOT NULL,
      discipline_code TEXT NOT NULL,
      academic_level TEXT CHECK(academic_level IN ('UG', 'PG')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discipline_code) REFERENCES discipline(discipline_code)
    );
    CREATE TABLE discipline (
      discipline_code TEXT PRIMARY KEY,
      discipline_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE unit_offering (
      unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester TEXT NOT NULL,
      location TEXT NOT NULL,
      mode TEXT CHECK(mode IN ('Internal', 'Online')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_code) REFERENCES unit(unit_code),
      UNIQUE(unit_code, year, semester, location, mode)
    );
    INSERT INTO discipline (discipline_code, discipline_name) VALUES ('GENERAL', 'General');
    INSERT INTO unit (unit_code, unit_name, discipline_code, academic_level)
      VALUES ('ISYS2001', 'Intro Programming', 'GENERAL', 'UG');
    INSERT INTO unit_offering (unit_code, year, semester, location, mode)
      VALUES ('ISYS2001', 2024, 'Semester 1', 'Bentley', 'Internal');
    PRAGMA foreign_keys = ON;
  `);
  return db;
}

describe('upgradeUnitOfferingModeCheck (via createSchema)', () => {
  it('is a no-op on a fresh DB — table created with the new CHECK', () => {
    const db = makeDb();
    createSchema(db); // no error
    const sql = (db
      .prepare(`SELECT sql FROM sqlite_schema WHERE type='table' AND name='unit_offering'`)
      .get() as { sql: string }).sql;
    expect(sql).toContain(`'Aggregated'`);
    // 'Aggregated' inserts succeed. Insert discipline FIRST — unit has a
    // foreign key reference to it.
    db.prepare(
      `INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)`,
    ).run('GENERAL', 'General');
    db.prepare(
      `INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code, academic_level) VALUES (?, ?, ?, ?)`,
    ).run('TEST1001', 'Test', 'GENERAL', 'UG');
    expect(() =>
      db
        .prepare(
          `INSERT INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('TEST1001', 2024, 'Semester 1', 'All Campuses', 'Aggregated'),
    ).not.toThrow();
  });

  it('upgrades an OLD DB in place — admits Aggregated after createSchema', () => {
    const db = makeOldDb();

    // Sanity: before upgrade, inserting 'Aggregated' fails on the old CHECK.
    expect(() =>
      db
        .prepare(
          `INSERT INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('ISYS2001', 2025, 'Semester 1', 'All Campuses', 'Aggregated'),
    ).toThrow();

    createSchema(db); // runs the upgrade

    // After upgrade, 'Aggregated' is admitted.
    expect(() =>
      db
        .prepare(
          `INSERT INTO unit_offering (unit_code, year, semester, location, mode) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('ISYS2001', 2025, 'Semester 1', 'All Campuses', 'Aggregated'),
    ).not.toThrow();
  });

  it('preserves existing offering data through the upgrade', () => {
    const db = makeOldDb();

    // Capture pre-upgrade state.
    const before = db.prepare(`SELECT * FROM unit_offering`).all() as any[];
    expect(before).toHaveLength(1);
    expect(before[0].mode).toBe('Internal');
    const beforeId = before[0].unit_offering_id;

    createSchema(db);

    // Same row survives, same primary key.
    const after = db.prepare(`SELECT * FROM unit_offering`).all() as any[];
    expect(after).toHaveLength(1);
    expect(after[0].unit_offering_id).toBe(beforeId);
    expect(after[0].mode).toBe('Internal');
    expect(after[0].unit_code).toBe('ISYS2001');
  });

  it('is idempotent — running createSchema twice on an already-upgraded DB is safe', () => {
    const db = makeOldDb();
    createSchema(db); // first run upgrades
    expect(() => createSchema(db)).not.toThrow(); // second run no-ops
    // No spurious tables left behind from the rebuild.
    const tables = db
      .prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE 'unit_offering%'`)
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(['unit_offering']);
  });
});
