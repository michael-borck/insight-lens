// The database schema, as a single dependency-free function. Kept separate from database.ts so it
// can be applied to any SQLite connection (the app's better-sqlite3 in prod, an in-memory database
// in tests) without pulling in the native driver. The db only needs an exec() method.

export interface SqlExecutor {
  exec(sql: string): unknown;
}

export function createSchema(db: SqlExecutor): void {
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

    -- Unit offering table
    CREATE TABLE IF NOT EXISTS unit_offering (
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

    -- Insert standard questions if they don't exist
    INSERT OR IGNORE INTO question (question_text, question_short) VALUES
      ('I was engaged by the learning activities', 'engagement'),
      ('The resources provided helped me to learn', 'resources'),
      ('My learning was supported', 'support'),
      ('Assessments helped me to demonstrate my learning', 'assessments'),
      ('I knew what was expected of me', 'expectations'),
      ('Overall, this unit was a worthwhile experience', 'overall');
  `);
}
