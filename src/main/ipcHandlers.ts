import { ipcMain } from 'electron';
import Store from 'electron-store';
import { getDatabase, dbHelpers } from './database';
import { extractSurveyData } from './pdfExtractor';
import { analyzeSentimentSimple } from './sentiment';
import path from 'path';

export function setupIpcHandlers(store: Store) {
  // Database query handler
  ipcMain.handle('db:query', async (event, sql: string, params?: any[]) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });

  // Database execute handler (for INSERT, UPDATE, DELETE)
  ipcMain.handle('db:execute', async (event, sql: string, params?: any[]) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();
      return result;
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  });

  // PDF extraction handler
  ipcMain.handle('pdf:extract', async (event, filePath: string) => {
    try {
      const data = await extractSurveyData(filePath);
      return { success: true, data };
    } catch (error) {
      console.error('PDF extraction error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    return {
      databasePath: store.get('databasePath', path.join(require('electron').app.getPath('userData'), 'surveys.db')),
      apiUrl: store.get('apiUrl', 'https://api.openai.com/v1'),
      apiKey: store.get('apiKey', ''),
      aiModel: store.get('aiModel', 'gpt-4o-mini')
    };
  });

  ipcMain.handle('settings:set', async (event, settings: any) => {
    if (settings.databasePath !== undefined) store.set('databasePath', settings.databasePath);
    if (settings.apiUrl !== undefined) store.set('apiUrl', settings.apiUrl);
    if (settings.apiKey !== undefined) store.set('apiKey', settings.apiKey);
    if (settings.aiModel !== undefined) store.set('aiModel', settings.aiModel);
  });

  // Import surveys handler
  ipcMain.handle('surveys:import', async (event, filePaths: string[]) => {
    const results = {
      success: 0,
      duplicates: 0,
      failed: 0,
      details: [] as any[]
    };

    const db = getDatabase();

    for (const filePath of filePaths) {
      try {
        // Extract data from PDF
        const extractResult = await extractSurveyData(filePath);
        
        if (!extractResult.success) {
          results.failed++;
          results.details.push({
            file: path.basename(filePath),
            status: 'failed',
            error: extractResult.error
          });
          continue;
        }

        const data = extractResult.data!;
        const unitInfo = data.unit_info;

        // Check if survey already exists
        if (unitInfo.unit_code && unitInfo.year && unitInfo.term && unitInfo.campus_name && unitInfo.mode &&
            dbHelpers.surveyExists(
          unitInfo.unit_code,
          parseInt(unitInfo.year),
          unitInfo.term,
          unitInfo.campus_name,
          unitInfo.mode
        )) {
          results.duplicates++;
          results.details.push({
            file: path.basename(filePath),
            status: 'duplicate',
            unit: unitInfo.unit_code,
            period: `${unitInfo.term} ${unitInfo.year}`
          });
          continue;
        }

        // Validate required fields
        if (!unitInfo.unit_code || !unitInfo.unit_name || !unitInfo.year || 
            !unitInfo.term || !unitInfo.campus_name || !unitInfo.mode) {
          results.failed++;
          results.details.push({
            file: path.basename(filePath),
            status: 'failed',
            error: 'Missing required unit information'
          });
          continue;
        }

        // Import the survey data
        db.transaction(() => {
          // Insert discipline if not exists
          db.prepare(`
            INSERT OR IGNORE INTO discipline (discipline_code, discipline_name)
            VALUES (?, ?)
          `).run('GENERAL', 'General Studies'); // Default for now

          // Insert unit if not exists
          db.prepare(`
            INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code, academic_level)
            VALUES (?, ?, ?, ?)
          `).run(unitInfo.unit_code, unitInfo.unit_name, 'GENERAL', 'UG');

          // Insert unit offering
          const offeringResult = db.prepare(`
            INSERT OR IGNORE INTO unit_offering (unit_code, year, semester, location, mode)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            unitInfo.unit_code!,
            parseInt(unitInfo.year!),
            unitInfo.term!,
            unitInfo.campus_name!,
            unitInfo.mode!
          );

          const unitOfferingId = offeringResult.lastInsertRowid;

          // Insert survey event if not exists
          const eventResult = db.prepare(`
            INSERT OR IGNORE INTO survey_event (event_name, institution)
            VALUES (?, ?)
          `).run(`${unitInfo.term} ${unitInfo.year}`, 'Curtin University');

          const eventId = eventResult.lastInsertRowid;

          // Insert unit survey
          const surveyResult = db.prepare(`
            INSERT INTO unit_survey (
              unit_offering_id, event_id, enrolments, responses, 
              response_rate, overall_experience, pdf_file_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            unitOfferingId,
            eventId,
            data.response_stats.enrollments || 0,
            data.response_stats.responses || 0,
            data.response_stats.response_rate || 0,
            data.percentage_agreement.overall || 0,
            path.basename(filePath)
          );

          const surveyId = surveyResult.lastInsertRowid;

          // Insert survey results for each question
          const questions = getDatabase().prepare('SELECT * FROM question').all() as any[];
          
          for (const question of questions) {
            const agreement = data.percentage_agreement[question.question_short as keyof typeof data.percentage_agreement];
            if (agreement !== undefined) {
              db.prepare(`
                INSERT INTO unit_survey_result (survey_id, question_id, percent_agree)
                VALUES (?, ?, ?)
              `).run(surveyId, question.question_id, agreement);
            }
          }

          // Insert benchmarks
          for (const benchmark of data.benchmarks) {
            for (const question of questions) {
              const paKey = `${question.question_short.charAt(0).toUpperCase() + question.question_short.slice(1)}_PA`;
              const percentAgree = benchmark[paKey];
              
              if (percentAgree !== undefined) {
                db.prepare(`
                  INSERT INTO benchmark (
                    survey_id, question_id, group_type, 
                    group_description, percent_agree, response_count
                  ) VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                  surveyId,
                  question.question_id,
                  benchmark.Level,
                  benchmark.Level,
                  percentAgree,
                  benchmark[`${question.question_short}_N`] || 0
                );
              }
            }
          }

          // Insert comments with sentiment analysis
          for (const comment of data.comments) {
            // Simple sentiment analysis
            const sentiment = analyzeSentimentSimple(comment);
            
            db.prepare(`
              INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label)
              VALUES (?, ?, ?, ?)
            `).run(surveyId, comment, sentiment.score, sentiment.label);
          }
        })();

        results.success++;
        results.details.push({
          file: path.basename(filePath),
          status: 'success',
          unit: unitInfo.unit_code,
          period: `${unitInfo.term} ${unitInfo.year}`
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          file: path.basename(filePath),
          status: 'failed',
          error: (error as Error).message
        });
      }
    }

    return results;
  });
}