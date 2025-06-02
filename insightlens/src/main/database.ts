import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export async function setupDatabase(dbPath: string): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Open database
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables if they don't exist
  createTables();
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

function createTables() {
  if (!db) return;

  // Create tables based on the existing schema
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

// Helper functions for common queries
export const dbHelpers = {
  // Get all units
  getAllUnits: () => {
    const stmt = getDatabase().prepare(`
      SELECT u.*, d.discipline_name 
      FROM unit u 
      JOIN discipline d ON u.discipline_code = d.discipline_code 
      ORDER BY u.unit_code
    `);
    return stmt.all();
  },

  // Get unit surveys
  getUnitSurveys: (unitCode: string) => {
    const stmt = getDatabase().prepare(`
      SELECT us.*, uo.year, uo.semester, uo.location, uo.mode
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      WHERE uo.unit_code = ?
      ORDER BY uo.year DESC, uo.semester DESC
    `);
    return stmt.all(unitCode);
  },

  // Check if survey exists
  surveyExists: (unitCode: string, year: number, semester: string, location: string, mode: string) => {
    const stmt = getDatabase().prepare(`
      SELECT COUNT(*) as count
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      WHERE uo.unit_code = ? AND uo.year = ? AND uo.semester = ? 
        AND uo.location = ? AND uo.mode = ?
    `);
    const result = stmt.get(unitCode, year, semester, location, mode) as { count: number };
    return result.count > 0;
  }
};