// The database schema, as a single dependency-free function. Kept separate from database.ts so it
// can be applied to any SQLite connection (node:sqlite in prod, an in-memory database in tests).
// The db only needs an exec() method.

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
