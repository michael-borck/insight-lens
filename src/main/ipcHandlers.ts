import { ipcMain, shell } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import { getDatabase, dbHelpers } from './database';
import { extractSurveyData } from './pdfExtractor';
import { analyzeSentimentSimple } from './sentiment';
import path from 'path';
import fetch from 'node-fetch';

export function setupIpcHandlers(store: Store) {
  // Database query handler
  ipcMain.handle('db:query', async (event, sql: string, params?: any[]) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    } catch (error) {
      log.error('Database query error:', error);
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
      log.error('Database execute error:', error);
      throw error;
    }
  });

  // PDF extraction handler
  ipcMain.handle('pdf:extract', async (event, filePath: string) => {
    try {
      const data = await extractSurveyData(filePath);
      return { success: true, data };
    } catch (error) {
      log.error('PDF extraction error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Database introspection handlers for AI context
  ipcMain.handle('db:getStats', async () => {
    try {
      return dbHelpers.getDatabaseStats();
    } catch (error) {
      log.error('Database stats error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getSampleData', async () => {
    try {
      return dbHelpers.getSampleData();
    } catch (error) {
      log.error('Sample data error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getDataAvailability', async () => {
    try {
      return dbHelpers.getDataAvailability();
    } catch (error) {
      log.error('Data availability error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getCourseRecommendationData', async (event, surveyId: number) => {
    try {
      return dbHelpers.getCourseRecommendationData(surveyId);
    } catch (error) {
      log.error('Course recommendation data error:', error);
      throw error;
    }
  });

  // AI service handlers
  ipcMain.handle('ai:askInsightLens', async (event, question: string) => {
    try {
      const settings = {
        apiUrl: store.get('apiUrl', 'https://api.openai.com/v1') as string,
        apiKey: store.get('apiKey', '') as string,
        aiModel: store.get('aiModel', 'gpt-4o-mini') as string
      };

      // Get effective API key (stored or environment)
      const effectiveKey = getApiKey(settings.apiKey, settings.apiUrl);
      settings.apiKey = effectiveKey;

      // Auto-correct model based on API provider
      if (settings.apiUrl.includes('anthropic.com')) {
        // For Anthropic, use Claude models
        if (settings.aiModel.includes('gpt') || settings.aiModel.includes('openai')) {
          log.debug('Auto-correcting OpenAI model to Claude for Anthropic API');
          settings.aiModel = 'claude-3-5-sonnet-20241022'; // Default Claude model
        }
      } else if (settings.apiUrl.includes('openai.com')) {
        // For OpenAI, use GPT models
        if (settings.aiModel.includes('claude') || settings.aiModel.includes('anthropic')) {
          log.debug('Auto-correcting Claude model to GPT for OpenAI API');
          settings.aiModel = 'gpt-4o-mini'; // Default OpenAI model
        }
      }

      log.debug('Final settings:', {
        apiUrl: settings.apiUrl,
        model: settings.aiModel,
        hasKey: !!settings.apiKey
      });

      return await makeAiRequest(settings, question);
    } catch (error) {
      log.error('AI request error:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:generateRecommendations', async (event, surveyId: number) => {
    try {
      const settings = {
        apiUrl: store.get('apiUrl', 'https://api.openai.com/v1') as string,
        apiKey: store.get('apiKey', '') as string,
        aiModel: store.get('aiModel', 'gpt-4o-mini') as string
      };

      // Get effective API key (stored or environment)
      const effectiveKey = getApiKey(settings.apiKey, settings.apiUrl);
      settings.apiKey = effectiveKey;

      return await makeRecommendationRequest(settings, surveyId);
    } catch (error) {
      log.error('AI recommendation error:', error);
      throw error;
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
      
      log.info('=== API Connection Test ===');
      log.info('Testing API:', apiUrl);
      log.debug('Test connection debug:', {
        apiUrl,
        providedKey: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
        effectiveKey: effectiveKey ? effectiveKey.substring(0, 10) + '...' : 'none',
        envANTHROPIC: process.env.ANTHROPIC_API_KEY ? 'present' : 'missing',
        envOPENAI: process.env.OPENAI_API_KEY ? 'present' : 'missing'
      });
      
      if (!effectiveKey && (apiUrl.includes('openai.com') || apiUrl.includes('anthropic.com'))) {
        return { success: false, error: 'API key is required for this provider' };
      }

      const headers: Record<string, string> = {};
      
      // For Anthropic, test with messages endpoint
      if (apiUrl.includes('anthropic.com')) {
        headers['Content-Type'] = 'application/json';
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true'; // For CORS issues
        if (effectiveKey) {
          headers['x-api-key'] = effectiveKey;
        }
        
        // Ensure proper Anthropic URL format
        let testUrl = apiUrl;
        if (!testUrl.endsWith('/v1')) {
          testUrl += '/v1';
        }
        testUrl += '/messages';
        
        log.debug('Making Anthropic test request to:', testUrl);
        
        try {
          const response = await fetch(testUrl, {
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
            return { success: false, error: 'Invalid API key for Claude. Please check your ANTHROPIC_API_KEY environment variable or API key in settings.' };
          } else if (response.status === 403) {
            return { success: false, error: 'Access forbidden. Please check your Claude API key permissions.' };
          } else if (response.status === 429) {
            return { success: false, error: 'Claude API rate limit exceeded. Please wait before trying again.' };
          } else {
            const errorText = await response.text();
            log.error('Anthropic API detailed error:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText,
              headers: Object.fromEntries(response.headers.entries())
            });
            return { success: false, error: `Claude API error: HTTP ${response.status}. ${errorText}` };
          }
        } catch (fetchError) {
          log.error('Claude API connection error:', fetchError);
          return { success: false, error: `Failed to connect to Claude API: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` };
        }
      } else if (apiUrl.includes('ollama')) {
        // For Ollama, check if API key is needed
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // Test with models endpoint or generate endpoint
        try {
          const testUrl = apiUrl + (apiUrl.endsWith('/v1') ? '/models' : '/api/tags');
          const response = await fetch(testUrl, { headers });
          
          if (response.ok) {
            return { success: true, message: 'Ollama connection successful!' };
          } else if (response.status === 401) {
            return { success: false, error: 'Authentication required. Please provide a Bearer token.' };
          } else {
            // Try the base URL as fallback
            const baseResponse = await fetch(apiUrl, { headers });
            if (baseResponse.ok || baseResponse.status === 404) {
              return { success: true, message: 'Ollama server found!' };
            }
            return { success: false, error: `Ollama server error: HTTP ${response.status}` };
          }
        } catch (error) {
          return { success: false, error: `Failed to connect to Ollama server: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
      } else {
        // For other APIs (OpenAI, etc.)
        if (effectiveKey) {
          headers['Authorization'] = `Bearer ${effectiveKey}`;
        }
      }

      // For other APIs (OpenAI, etc.), test models endpoint
      try {
        const modelsUrl = apiUrl.endsWith('/v1') ? apiUrl + '/models' : apiUrl + '/v1/models';
        log.debug('Testing models endpoint:', modelsUrl);
        
        const response = await fetch(modelsUrl, { headers });
        log.debug('Models endpoint response:', response.status);
        
        if (response.ok) {
          log.info('✓ Connection test successful');
          return { success: true, message: 'Connection successful!' };
        } else if (response.status === 401) {
          log.warn('✗ Authentication failed (401)');
          return { success: false, error: 'Invalid API key. Please check your API key.' };
        } else if (response.status === 429) {
          log.warn('✗ Rate limit hit (429)');
          return { success: false, error: 'Rate limit exceeded. Please wait before trying again.' };
        } else if (response.status === 521 || response.status === 529) {
          log.warn(`✗ Cloudflare error (${response.status})`);
          return { success: false, error: `Service temporarily unavailable (Error ${response.status}). This often happens when the service is experiencing high traffic. Please try again in a few minutes.` };
        } else if (response.status === 404) {
          // Try base URL as fallback
          log.debug('Models endpoint not found, trying base URL');
          const baseResponse = await fetch(apiUrl, { headers });
          if (baseResponse.ok || baseResponse.status === 404) {
            log.info('✓ Base URL accessible');
            return { success: true, message: 'Connection successful! (Models list unavailable)' };
          }
          log.warn(`✗ Base URL returned ${baseResponse.status}`);
          return { success: false, error: `HTTP ${baseResponse.status}` };
        } else {
          log.warn(`✗ Unexpected status: ${response.status}`);
          return { success: false, error: `HTTP ${response.status}` };
        }
      } catch (error) {
        log.error('API connection test error:', error);
        return { success: false, error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your URL and network connection.` };
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

        // Normalize campus name to handle variations
        const normalizeCampusName = (campusName: string): string => {
          const normalized = campusName.trim();
          // Handle Bentley variations
          if (normalized.toLowerCase().includes('bentley')) {
            return 'Bentley';
          }
          // Add other normalizations as needed
          return normalized;
        };

        // Check if survey already exists
        if (unitInfo.unit_code && unitInfo.year && unitInfo.term && unitInfo.campus_name && unitInfo.mode &&
            dbHelpers.surveyExists(
          unitInfo.unit_code,
          parseInt(unitInfo.year),
          unitInfo.term,
          normalizeCampusName(unitInfo.campus_name),
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
            normalizeCampusName(unitInfo.campus_name!),
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
          log.debug(`Processing ${data.comments.length} comments for sentiment analysis...`);
          for (const comment of data.comments) {
            // Simple sentiment analysis
            const sentiment = analyzeSentimentSimple(comment);
            
            log.debug(`Comment: "${comment.substring(0, 50)}..."`, {
              score: sentiment.score,
              label: sentiment.label
            });
            
            db.prepare(`
              INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label)
              VALUES (?, ?, ?, ?)
            `).run(surveyId, comment, sentiment.score, sentiment.label);
          }
          log.debug(`Sentiment analysis complete for ${data.comments.length} comments.`);
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
      log.error('Failed to open external URL:', error);
      throw error;
    }
  });

  // Promotion analysis handlers
  ipcMain.handle('promotion:analyzeUnits', async (event, filters: any) => {
    try {
      const { analyzeUnitsForPromotion } = await import('./promotionAnalyzer');
      const results = await analyzeUnitsForPromotion(filters);
      return { success: true, data: results };
    } catch (error) {
      log.error('Promotion analysis error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:getHighPerformers', async (event, minSatisfaction: number = 80) => {
    try {
      const { getHighPerformingUnits } = await import('./promotionAnalyzer');
      const units = await getHighPerformingUnits(minSatisfaction);
      return { success: true, data: units };
    } catch (error) {
      log.error('Failed to get high performing units:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateReport', async (event, unitData: any) => {
    try {
      const { generatePromotionReport, formatReportAsHTML, formatReportAsText } = await import('./promotionGenerator');
      const report = generatePromotionReport(unitData);
      const html = formatReportAsHTML(report);
      const text = formatReportAsText(report);
      return { 
        success: true, 
        data: { report, html, text }
      };
    } catch (error) {
      log.error('Report generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateSummary', async (event, unitsData: any[]) => {
    try {
      const { generateOverallSummaryReport, formatSummaryAsHTML, formatSummaryAsText } = await import('./promotionGenerator');
      const summary = generateOverallSummaryReport(unitsData);
      const html = formatSummaryAsHTML(summary);
      const text = formatSummaryAsText(summary);
      return { 
        success: true, 
        data: { summary, html, text }
      };
    } catch (error) {
      log.error('Summary generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:exportReport', async (event, format: 'pdf' | 'html' | 'text', content: string, filename: string) => {
    try {
      const { app, dialog } = require('electron');
      const fs = require('fs').promises;
      const path = require('path');
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: format === 'pdf' 
          ? [{ name: 'PDF Files', extensions: ['pdf'] }]
          : format === 'html'
          ? [{ name: 'HTML Files', extensions: ['html'] }]
          : [{ name: 'Text Files', extensions: ['txt'] }]
      });
      
      if (!result.canceled && result.filePath) {
        if (format === 'pdf') {
          // For PDF, we need to convert HTML to PDF
          const pdf = require('html-pdf');
          await new Promise((resolve, reject) => {
            pdf.create(content, { format: 'A4' }).toFile(result.filePath, (err: any) => {
              if (err) reject(err);
              else resolve(true);
            });
          });
        } else {
          // For HTML and text, write directly
          await fs.writeFile(result.filePath, content, 'utf8');
        }
        
        return { success: true, path: result.filePath };
      }
      
      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      log.error('Export error:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}

// AI request implementation functions
async function makeAiRequest(settings: any, question: string): Promise<any> {
  log.debug('Making AI request in main process:', {
    apiUrl: settings.apiUrl,
    model: settings.aiModel,
    hasKey: !!settings.apiKey,
    question: question.substring(0, 50) + '...'
  });

  // Check if we need an API key
  const isOllama = settings.apiUrl.includes('ollama');
  const isLocal = settings.apiUrl.includes('localhost') || settings.apiUrl.includes('127.0.0.1');
  const needsApiKey = (settings.apiUrl.includes('openai.com') || settings.apiUrl.includes('anthropic.com')) ||
                      (isOllama && settings.apiKey); // Ollama may optionally use API key
  
  if ((settings.apiUrl.includes('openai.com') || settings.apiUrl.includes('anthropic.com')) && !settings.apiKey) {
    return {
      success: false,
      error: 'API key is required for this provider. Please configure your API key in Settings.'
    };
  }

  try {
    // Generate system prompt and database context
    const systemPrompt = await generateSystemPrompt(settings.aiModel, settings.apiUrl);
    
    const isAnthropic = settings.apiUrl.includes('anthropic.com');
    
    // Ensure proper API URL formatting
    let baseUrl = settings.apiUrl;
    if (!baseUrl.endsWith('/v1') && !isAnthropic) {
      baseUrl += '/v1';
    }
    if (!baseUrl.endsWith('/v1') && isAnthropic) {
      baseUrl += '/v1';
    }
    
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    // Handle API keys for different providers
    if (settings.apiKey) {
      if (isAnthropic) {
        headers['x-api-key'] = settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true'; // For CORS issues
      } else {
        // Both OpenAI and Ollama (when using auth) use Bearer tokens
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
      }
    }
    
    const endpoint = isAnthropic ? '/messages' : '/chat/completions';
    const fullUrl = baseUrl + endpoint;
    
    let requestBody: any;
    
    if (isAnthropic) {
      requestBody = {
        model: settings.aiModel,
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: question }
        ]
      };
    } else {
      requestBody = {
        model: settings.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.1,
        max_tokens: 1000
      };
    }
    
    log.debug('Making request to:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Handle specific error codes
      if (response.status === 529 || response.status === 521) {
        // Cloudflare errors - common with OpenAI
        throw new Error(`Service temporarily unavailable (Error ${response.status}). This often happens when OpenAI is experiencing high traffic. Please try again in a few moments.`);
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your API key in Settings.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (response.status === 404) {
        throw new Error('API endpoint not found. Please check your API URL configuration.');
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        throw new Error(`Server error (${response.status}). The AI service is temporarily unavailable. Please try again later.`);
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorText ? '. ' + errorText : ''}`);
    }

    const data = await response.json() as any;
    log.debug('AI response received, processing...');
    
    let content: string;
    
    if (isAnthropic) {
      content = data.content?.[0]?.text;
    } else {
      content = data.choices?.[0]?.message?.content;
    }

    if (!content) {
      log.error('No content in AI response:', data);
      throw new Error('No response from AI');
    }
    
    // Parse JSON response
    try {
      let cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove common prefixes
      if (cleanContent.startsWith('Here is the JSON:') || cleanContent.startsWith('Here\'s the JSON:')) {
        cleanContent = cleanContent.replace(/^Here'?s? the JSON:\s*/i, '');
      }
      
      cleanContent = cleanContent.trim();
      
      // Extract JSON from within text if needed
      if (!cleanContent.startsWith('{') && cleanContent.includes('{')) {
        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleanContent = cleanContent.substring(jsonStart, jsonEnd);
        }
      }
      
      const parsed = JSON.parse(cleanContent);
      
      if (parsed.error) {
        return { success: false, error: parsed.error };
      }

      return { success: true, chartSpec: parsed };
    } catch (parseError) {
      log.error('JSON parsing failed:', parseError);
      log.error('Raw content:', content);
      
      // If it's clearly not meant to be JSON, treat it as a text response
      if (!content.includes('{') && !content.includes('[')) {
        return {
          success: true,
          chartSpec: {
            chartType: 'summary',
            title: 'AI Response',
            data: { sql: '', xAxis: '', yAxis: '' },
            insights: content
          }
        };
      }
      
      return {
        success: false,
        error: `AI returned an invalid response format. Try asking a simpler question.`,
        message: content
      };
    }

  } catch (error) {
    log.error('AI request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function makeRecommendationRequest(settings: any, surveyId: number): Promise<any> {
  // Implementation for course recommendations - simplified for now
  return {
    success: false,
    error: 'Course recommendations feature temporarily disabled while fixing AI integration'
  };
}

async function generateSystemPrompt(modelName: string, apiUrl: string): Promise<string> {
  try {
    const [stats, sampleData, availability] = await Promise.all([
      dbHelpers.getDatabaseStats(),
      dbHelpers.getSampleData(),
      dbHelpers.getDataAvailability()
    ]);

    const hasData = stats.totalSurveys.count > 0;
    const dataWarning = !hasData ? "\n⚠️  WARNING: Database appears to be empty or has very limited data. Inform the user that they need to import survey data first.\n" : "";

    return `
You are InsightLens AI, an expert assistant for analyzing university survey data.

Database Schema & Current Data:
- unit: unit_code (PK), unit_name, discipline_code, academic_level (${stats.totalUnits.count} units)
- discipline: discipline_code (PK), discipline_name (${stats.disciplines.count} disciplines)
- unit_offering: unit_offering_id (PK), unit_code, year, semester, location, mode
- unit_survey: survey_id (PK), unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience (${stats.totalSurveys.count} surveys)
- unit_survey_result: result_id (PK), survey_id, question_id, percent_agree, strongly_disagree, disagree, neutral, agree, strongly_agree
- question: question_id (PK), question_text, question_short (engagement, resources, support, assessments, expectations, overall)
- comment: comment_id (PK), survey_id, comment_text, sentiment_score, sentiment_label (${stats.totalComments.count} comments)
- benchmark: benchmark_id (PK), survey_id, question_id, group_type, group_description, percent_agree, response_count
${dataWarning}
Data Range: ${stats.yearRange.min_year} - ${stats.yearRange.max_year}
Available Years: ${availability.availableYears.join(', ')}
Available Campuses: ${availability.availableCampuses.join(', ')}

Available chart types:
- line: For trends over time (requires x/y axes with temporal data)
- bar: For comparisons (requires categories and values) 
- table: For detailed data listing (always safe fallback)
- summary: For simple statistics or insights when no chart is appropriate

CRITICAL: You MUST return ONLY valid JSON in this format:
{
  "chartType": "line|bar|table|summary",
  "title": "Descriptive title",
  "data": {
    "sql": "SELECT statement with CORRECT table names and joins",
    "xAxis": "exact_column_name_from_select",
    "yAxis": "exact_column_name_from_select"
  },
  "insights": "Brief explanation of what the data shows"
}

For insufficient data: {"error": "Specific explanation with suggestions"}
`;
  } catch (error) {
    return `
You are InsightLens AI for analyzing survey data.
⚠️  Could not load database context. Database may be empty.
Return: {"error": "Database not available. Please import survey data first."}
`;
  }
}