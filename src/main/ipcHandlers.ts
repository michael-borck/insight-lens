import { ipcMain, shell } from 'electron';
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

  // Helper function to get API key from environment or store
  const getApiKey = (storedKey: string, apiUrl: string): string => {
    // If stored key exists, use it
    if (storedKey) return storedKey;
    
    // Otherwise, check environment variables based on API URL
    if (apiUrl.includes('openai.com')) {
      return process.env.OPENAI_API_KEY || '';
    } else if (apiUrl.includes('anthropic.com') || apiUrl.includes('claude')) {
      return process.env.ANTHROPIC_API_KEY || '';
    } else if (apiUrl.includes('googleapis.com') || apiUrl.includes('gemini')) {
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
    } else if (apiUrl.includes('cohere.ai')) {
      return process.env.COHERE_API_KEY || '';
    } else if (apiUrl.includes('huggingface.co')) {
      return process.env.HUGGINGFACE_API_KEY || '';
    }
    
    return '';
  };

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    const apiUrl = store.get('apiUrl', 'https://api.openai.com/v1') as string;
    const storedKey = store.get('apiKey', '') as string;
    
    return {
      databasePath: store.get('databasePath', path.join(require('electron').app.getPath('userData'), 'surveys.db')),
      apiUrl,
      apiKey: getApiKey(storedKey, apiUrl),
      aiModel: store.get('aiModel', 'gpt-4o-mini')
    };
  });

  // Check if API key is available from environment
  ipcMain.handle('settings:hasEnvKey', async (event, apiUrl: string) => {
    const envKeys = {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
      cohere: !!process.env.COHERE_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY
    };
    
    if (apiUrl.includes('openai.com')) return { hasKey: envKeys.openai, source: 'OPENAI_API_KEY' };
    if (apiUrl.includes('anthropic.com') || apiUrl.includes('claude')) return { hasKey: envKeys.anthropic, source: 'ANTHROPIC_API_KEY' };
    if (apiUrl.includes('googleapis.com') || apiUrl.includes('gemini')) return { hasKey: envKeys.google, source: 'GOOGLE_API_KEY or GEMINI_API_KEY' };
    if (apiUrl.includes('cohere.ai')) return { hasKey: envKeys.cohere, source: 'COHERE_API_KEY' };
    if (apiUrl.includes('huggingface.co')) return { hasKey: envKeys.huggingface, source: 'HUGGINGFACE_API_KEY' };
    
    return { hasKey: false, source: null };
  });

  // Test API connection
  ipcMain.handle('settings:testConnection', async (event, apiUrl: string, apiKey: string) => {
    try {
      // Get effective API key (stored or environment)
      const effectiveKey = getApiKey(apiKey, apiUrl);
      
      if (!effectiveKey && (apiUrl.includes('openai.com') || apiUrl.includes('anthropic.com'))) {
        return { success: false, error: 'API key is required for this provider' };
      }

      const headers: Record<string, string> = {};
      if (effectiveKey) {
        headers['Authorization'] = `Bearer ${effectiveKey}`;
      }

      // For Anthropic, test with messages endpoint
      if (apiUrl.includes('anthropic.com')) {
        headers['Content-Type'] = 'application/json';
        headers['anthropic-version'] = '2023-06-01';
        
        const response = await fetch(apiUrl + '/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });

        if (response.ok || response.status === 400) {
          return { success: true, message: 'Claude API connection successful!' };
        } else if (response.status === 401) {
          return { success: false, error: 'Invalid API key for Claude' };
        } else {
          return { success: false, error: `Claude API error: HTTP ${response.status}` };
        }
      }

      // For other APIs, test models endpoint
      try {
        const response = await fetch(apiUrl + '/models', { headers });
        
        if (response.ok) {
          return { success: true, message: 'Connection successful!' };
        } else if (response.status === 401) {
          return { success: false, error: 'Invalid API key' };
        } else if (response.status === 404) {
          // Try base URL
          const baseResponse = await fetch(apiUrl, { headers });
          if (baseResponse.ok || baseResponse.status === 404) {
            return { success: true, message: 'Connection successful! (Models list unavailable)' };
          }
          return { success: false, error: `HTTP ${baseResponse.status}` };
        } else {
          return { success: false, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        return { success: false, error: 'Connection failed. Check your URL.' };
      }
      
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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

  // Shell operations
  ipcMain.handle('shell:openExternal', async (event, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open external URL:', error);
      throw error;
    }
  });
}