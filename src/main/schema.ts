// The database schema, as a single dependency-free function. Kept separate from database.ts so it
// can be applied to any SQLite connection (node:sqlite in prod, an in-memory database in tests).
// The db needs exec() for DDL/seed and prepare() for one-shot schema introspection during the
// unit_offering.mode CHECK constraint upgrade (see upgradeUnitOfferingModeCheck below).

export interface SqlExecutor {
  exec(sql: string): unknown;
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
  };
}

export function createSchema(db: SqlExecutor): void {
  // An existing-DB upgrade path runs BEFORE the CREATE TABLE IF NOT EXISTS
  // statements so it can rebuild the unit_offering table when the old
  // CHECK constraint is present. Idempotent: no-op on fresh DBs and on
  // DBs already upgraded. See the function for the safety properties.
  upgradeUnitOfferingModeCheck(db);

  db.exec(`
    -- Discipline table
    CREATE TABLE IF NOT EXISTS discipline (
      discipline_code TEXT PRIMARY KEY,
      discipline_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Unit table
    CREATE TABLE IF NOT EXISTS unit (
      unit_code TEXT PRIMARY KEY,
      unit_name TEXT NOT NULL,
      discipline_code TEXT NOT NULL,
      academic_level TEXT CHECK(academic_level IN ('UG', 'PG')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discipline_code) REFERENCES discipline(discipline_code)
    );

    -- Unit offering table.
    -- mode = 'Internal' / 'Online' for per-campus Insight reports; 'Aggregated'
    -- for eValuate Full Unit Reports which combine across modes ("Aggregation:
    -- All results aggregated" in the PDF). The CHECK was widened in 2026-05;
    -- existing DBs are upgraded in-place by upgradeUnitOfferingModeCheck().
    CREATE TABLE IF NOT EXISTS unit_offering (
      unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester TEXT NOT NULL,
      location TEXT NOT NULL,
      mode TEXT CHECK(mode IN ('Internal', 'Online', 'Aggregated')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_code) REFERENCES unit(unit_code),
      UNIQUE(unit_code, year, semester, location, mode)
    );

    -- Survey event table
    CREATE TABLE IF NOT EXISTS survey_event (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      institution TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Question table
    CREATE TABLE IF NOT EXISTS question (
      question_id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL UNIQUE,
      question_short TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Unit survey table
    CREATE TABLE IF NOT EXISTS unit_survey (
      survey_id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_offering_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      enrolments INTEGER NOT NULL,
      responses INTEGER NOT NULL,
      response_rate REAL NOT NULL,
      overall_experience REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      pdf_file_name TEXT,
      FOREIGN KEY (unit_offering_id) REFERENCES unit_offering(unit_offering_id),
      FOREIGN KEY (event_id) REFERENCES survey_event(event_id),
      UNIQUE(unit_offering_id, event_id)
    );

    -- Unit survey result table
    CREATE TABLE IF NOT EXISTS unit_survey_result (
      result_id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      percent_agree REAL NOT NULL,
      strongly_disagree INTEGER DEFAULT 0,
      disagree INTEGER DEFAULT 0,
      neutral INTEGER DEFAULT 0,
      agree INTEGER DEFAULT 0,
      strongly_agree INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id),
      FOREIGN KEY (question_id) REFERENCES question(question_id),
      UNIQUE(survey_id, question_id)
    );

    -- Benchmark table
    CREATE TABLE IF NOT EXISTS benchmark (
      benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      group_type TEXT NOT NULL,
      group_description TEXT NOT NULL,
      percent_agree REAL NOT NULL,
      response_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id),
      FOREIGN KEY (question_id) REFERENCES question(question_id)
    );

    -- Comment table
    CREATE TABLE IF NOT EXISTS comment (
      comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      comment_text TEXT NOT NULL,
      sentiment_score REAL,
      sentiment_label TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id)
    );

    -- Insert standard questions if they don't exist.
    -- The 'question_short' codes are namespaced so Insight + eValuate items
    -- can coexist in the same table:
    --   • Insight uses thematic names ('engagement', 'resources', …)
    --     that match the keys on SurveyData.percentage_agreement.
    --   • eValuate uses 'eval_q1'..'eval_q11' (positional — eValuate's
    --     11 items are an ordered, canonical instrument; thematic names
    --     don't map cleanly across all of them).
    -- INSERT OR IGNORE makes this idempotent — safe on fresh DBs AND on
    -- existing DBs that already have any subset.
    INSERT OR IGNORE INTO question (question_text, question_short) VALUES
      -- Insight Unit Survey (current Curtin instrument)
      ('I was engaged by the learning activities', 'engagement'),
      ('The resources provided helped me to learn', 'resources'),
      ('My learning was supported', 'support'),
      ('Assessments helped me to demonstrate my learning', 'assessments'),
      ('I knew what was expected of me', 'expectations'),
      ('Overall, this unit was a worthwhile experience', 'overall'),
      -- eValuate Full Unit Report (legacy Curtin instrument).
      -- Wording is the canonical Curtin form; verbatim from the FUR PDFs.
      ('The learning outcomes in this unit are clearly identified.', 'eval_q1'),
      ('The learning experiences in this unit help me to achieve the learning outcomes.', 'eval_q2'),
      ('The learning resources in this unit help me to achieve the learning outcomes.', 'eval_q3'),
      ('The assessment tasks in this unit evaluate my achievement of the learning outcomes.', 'eval_q4'),
      ('Feedback on my work in this unit helps me to achieve the learning outcomes.', 'eval_q5'),
      ('The workload in this unit is appropriate to the achievement of the learning outcomes.', 'eval_q6'),
      ('The quality of teaching in this unit helps me to achieve the learning outcomes.', 'eval_q7'),
      ('I am motivated to achieve the learning outcomes in this unit.', 'eval_q8'),
      ('I make best use of the learning experiences in this unit.', 'eval_q9'),
      ('I think about how I can learn more effectively in this unit.', 'eval_q10'),
      ('Overall, I am satisfied with this unit.', 'eval_q11');
  `);
}

/**
 * Widen the unit_offering.mode CHECK constraint to accept 'Aggregated'
 * (the third valid mode value, introduced for eValuate Full Unit Reports
 * which combine results across delivery modes). SQLite doesn't support
 * altering CHECK constraints in place, so we rebuild the table.
 *
 * Safety properties:
 *   • Idempotent: detects whether the upgrade is needed by reading the
 *     stored CREATE TABLE SQL. No-op on fresh DBs (table doesn't exist
 *     yet — the CREATE TABLE in createSchema below uses the new CHECK)
 *     AND on DBs already upgraded (no rebuild fires).
 *   • Data-preserving: data is copied SELECT * → INSERT before the old
 *     table is dropped, inside a transaction. Foreign keys are
 *     temporarily disabled because dropping a referenced table while
 *     FKs are on would cascade through unit_survey.
 *   • Atomic: the rebuild is wrapped in BEGIN/COMMIT; a crash mid-
 *     migration rolls back to the old shape, no data lost.
 *
 * Runs BEFORE the CREATE TABLE IF NOT EXISTS block in createSchema so
 * existing tables are upgraded first, then the IF NOT EXISTS no-ops
 * (table now has the new CHECK).
 */
function upgradeUnitOfferingModeCheck(db: SqlExecutor): void {
  // Read the existing CREATE TABLE SQL. Null if the table doesn't exist yet
  // (fresh DB) — nothing to upgrade.
  const row = db
    .prepare(`SELECT sql FROM sqlite_schema WHERE type='table' AND name='unit_offering'`)
    .get() as { sql: string } | undefined;
  if (!row) return;

  // Already upgraded? The new CHECK includes the literal "'Aggregated'".
  if (row.sql.includes(`'Aggregated'`)) return;

  // Old DB with the narrow CHECK — rebuild the table.
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;

    CREATE TABLE unit_offering_new (
      unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester TEXT NOT NULL,
      location TEXT NOT NULL,
      mode TEXT CHECK(mode IN ('Internal', 'Online', 'Aggregated')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_code) REFERENCES unit(unit_code),
      UNIQUE(unit_code, year, semester, location, mode)
    );

    INSERT INTO unit_offering_new
      (unit_offering_id, unit_code, year, semester, location, mode, created_at)
    SELECT
      unit_offering_id, unit_code, year, semester, location, mode, created_at
    FROM unit_offering;

    DROP TABLE unit_offering;
    ALTER TABLE unit_offering_new RENAME TO unit_offering;

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}
