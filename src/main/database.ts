import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createSchema } from './schema';

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
  createSchema(db);
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
  },

  // Get database statistics for AI context
  getDatabaseStats: () => {
    const db = getDatabase();
    
    const stats = {
      totalUnits: db.prepare('SELECT COUNT(*) as count FROM unit').get() as { count: number },
      totalSurveys: db.prepare('SELECT COUNT(*) as count FROM unit_survey').get() as { count: number },
      totalComments: db.prepare('SELECT COUNT(*) as count FROM comment').get() as { count: number },
      yearRange: db.prepare(`
        SELECT MIN(uo.year) as min_year, MAX(uo.year) as max_year 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
      `).get() as { min_year: number; max_year: number },
      disciplines: db.prepare('SELECT COUNT(DISTINCT discipline_code) as count FROM unit').get() as { count: number },
      campuses: db.prepare(`
        SELECT COUNT(DISTINCT uo.location) as count 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
      `).get() as { count: number }
    };

    return stats;
  },

  // Get sample data for AI context
  getSampleData: () => {
    const db = getDatabase();
    
    return {
      sampleUnits: db.prepare(`
        SELECT u.unit_code, u.unit_name, d.discipline_name 
        FROM unit u 
        JOIN discipline d ON u.discipline_code = d.discipline_code 
        LIMIT 3
      `).all(),
      
      sampleSurveyData: db.prepare(`
        SELECT 
          u.unit_code,
          uo.year,
          uo.semester,
          uo.location,
          us.enrolments,
          us.responses,
          us.response_rate,
          us.overall_experience
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        JOIN unit u ON uo.unit_code = u.unit_code
        ORDER BY uo.year DESC, uo.semester DESC
        LIMIT 3
      `).all(),

      sampleQuestionResults: db.prepare(`
        SELECT 
          q.question_short,
          q.question_text,
          usr.percent_agree
        FROM unit_survey_result usr
        JOIN question q ON usr.question_id = q.question_id
        LIMIT 5
      `).all(),

      sampleComments: db.prepare(`
        SELECT 
          comment_text,
          sentiment_score,
          sentiment_label
        FROM comment
        WHERE comment_text IS NOT NULL
        AND LENGTH(comment_text) > 10
        LIMIT 3
      `).all()
    };
  },

  // Get available data summary
  getDataAvailability: () => {
    const db = getDatabase();
    
    return {
      hasUnits: (db.prepare('SELECT COUNT(*) as count FROM unit').get() as { count: number }).count > 0,
      hasSurveys: (db.prepare('SELECT COUNT(*) as count FROM unit_survey').get() as { count: number }).count > 0,
      hasComments: (db.prepare('SELECT COUNT(*) as count FROM comment').get() as { count: number }).count > 0,
      hasResults: (db.prepare('SELECT COUNT(*) as count FROM unit_survey_result').get() as { count: number }).count > 0,
      hasBenchmarks: (db.prepare('SELECT COUNT(*) as count FROM benchmark').get() as { count: number }).count > 0,
      
      availableYears: db.prepare(`
        SELECT DISTINCT uo.year 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id 
        ORDER BY uo.year DESC
      `).all().map((row: any) => row.year),
      
      availableCampuses: db.prepare(`
        SELECT DISTINCT uo.location 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id 
        ORDER BY uo.location
      `).all().map((row: any) => row.location),
      
      availableDisciplines: db.prepare(`
        SELECT DISTINCT d.discipline_name 
        FROM discipline d 
        JOIN unit u ON d.discipline_code = u.discipline_code
        ORDER BY d.discipline_name
      `).all().map((row: any) => row.discipline_name)
    };
  },

  // Get comprehensive data for course improvement recommendations
  getCourseRecommendationData: (surveyId: number) => {
    const db = getDatabase();
    
    // Get basic survey and unit information
    const surveyInfo = db.prepare(`
      SELECT 
        us.*,
        uo.year,
        uo.semester,
        uo.location,
        uo.mode,
        u.unit_code,
        u.unit_name,
        u.academic_level,
        d.discipline_name,
        se.event_name,
        se.institution
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      JOIN unit u ON uo.unit_code = u.unit_code
      JOIN discipline d ON u.discipline_code = d.discipline_code
      LEFT JOIN survey_event se ON us.event_id = se.event_id
      WHERE us.survey_id = ?
    `).get(surveyId);

    if (!surveyInfo) {
      throw new Error('Survey not found');
    }

    // Get detailed question results
    const questionResults = db.prepare(`
      SELECT 
        q.question_text,
        q.question_short,
        usr.percent_agree,
        usr.strongly_disagree,
        usr.disagree,
        usr.neutral,
        usr.agree,
        usr.strongly_agree
      FROM unit_survey_result usr
      JOIN question q ON usr.question_id = q.question_id
      WHERE usr.survey_id = ?
      ORDER BY q.question_id
    `).all(surveyId);

    // Get comments with sentiment
    const comments = db.prepare(`
      SELECT 
        comment_text,
        sentiment_score,
        sentiment_label
      FROM comment
      WHERE survey_id = ?
      AND comment_text IS NOT NULL
      AND LENGTH(TRIM(comment_text)) > 0
      ORDER BY sentiment_score DESC
    `).all(surveyId);

    // Get benchmark comparisons
    const benchmarks = db.prepare(`
      SELECT 
        q.question_short,
        q.question_text,
        b.group_type,
        b.group_description,
        b.percent_agree as benchmark_score,
        b.response_count,
        usr.percent_agree as unit_score,
        (usr.percent_agree - b.percent_agree) as difference
      FROM benchmark b
      JOIN question q ON b.question_id = q.question_id
      JOIN unit_survey_result usr ON b.survey_id = usr.survey_id AND b.question_id = usr.question_id
      WHERE b.survey_id = ?
      ORDER BY difference ASC
    `).all(surveyId);

    // Get historical data for trend analysis
    const historicalData = db.prepare(`
      SELECT 
        uo.year,
        uo.semester,
        us.overall_experience,
        us.response_rate,
        us.responses,
        us.enrolments
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      WHERE uo.unit_code = ?
      AND us.survey_id != ?
      ORDER BY uo.year DESC, uo.semester DESC
      LIMIT 5
    `).all((surveyInfo as any).unit_code, surveyId);

    // Get question trends for key metrics
    const questionTrends = db.prepare(`
      SELECT 
        q.question_short,
        q.question_text,
        usr.percent_agree,
        uo.year,
        uo.semester
      FROM unit_survey_result usr
      JOIN question q ON usr.question_id = q.question_id
      JOIN unit_survey us ON usr.survey_id = us.survey_id
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      WHERE uo.unit_code = ?
      AND us.survey_id != ?
      ORDER BY uo.year DESC, uo.semester DESC, q.question_id
      LIMIT 30
    `).all((surveyInfo as any).unit_code, surveyId);

    // Calculate sentiment statistics
    const sentimentStats = {
      totalComments: comments.length,
      averageSentiment: comments.length > 0 ? 
        (comments as any).reduce((sum: number, c: any) => sum + (c.sentiment_score || 0), 0) / comments.length : 0,
      positiveCount: (comments as any).filter((c: any) => c.sentiment_label === 'positive').length,
      neutralCount: (comments as any).filter((c: any) => c.sentiment_label === 'neutral').length,
      negativeCount: (comments as any).filter((c: any) => c.sentiment_label === 'negative').length
    };

    return {
      surveyInfo,
      questionResults,
      comments: comments.slice(0, 20), // Limit for AI context
      benchmarks,
      historicalData,
      questionTrends,
      sentimentStats
    };
  }
};
