import { ipcMain, shell, app } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import { getDatabase, dbHelpers, runReadonlySelect } from './database';
import { runQuery } from './queries';
import * as promotion from './promotion';
import { extractSurveyData } from './pdfExtractor';
import { persistSurvey } from './importer';
import { extractFromPdf } from './pdfExtract';
import path from 'path';
import { complete, listModels, testConnection, parseJsonResponse, AiError } from './ai/client';
import { PROVIDERS, resolveEffectiveKey, hasEnvKey, inferProviderFromUrl } from './ai/providers';
import { AiConfig, ProviderId } from './ai/types';
import { getModelCapabilities, buildCourseRecommendationPrompt } from './ai/recommendations';

export function setupIpcHandlers(store: Store) {
  // App data access: named queries from the repository — no raw SQL crosses the boundary. ADR-0001.
  ipcMain.handle('query', async (event, name: string, params?: any) => {
    try {
      return runQuery(name, params);
    } catch (error) {
      log.error('Query error:', name, error);
      throw error;
    }
  });

  // AI-authored SQL only: hardened read-only channel (read-only connection, single SELECT, row cap).
  ipcMain.handle('db:queryReadonly', async (event, sql: string) => {
    try {
      return runReadonlySelect(sql);
    } catch (error) {
      log.error('Read-only query error:', error);
      throw error;
    }
  });

  // PDF extraction handler — uses the unified dispatcher so it returns
  // a discriminated result: { format: 'insight' | 'evaluate' | 'unknown',
  // success, data?, error? }. Renderer code that previously assumed the
  // Insight shape should branch on `format` before reading `data`.
  ipcMain.handle('pdf:extract', async (event, filePath: string) => {
    try {
      const result = await extractFromPdf(filePath);
      return { success: true, data: result };
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
  // Resolve the current provider, migrating legacy apiUrl-based config once.
  const getProvider = (): ProviderId => {
    let provider = store.get('provider', '') as string;
    if (!provider) {
      const legacyUrl = store.get('apiUrl', '') as string;
      provider = inferProviderFromUrl(legacyUrl);
      store.set('provider', provider);
      if (provider === 'custom' && legacyUrl && !store.get('baseUrl')) {
        store.set('baseUrl', legacyUrl);
      }
    }
    return provider as ProviderId;
  };

  // Build a resolved AiConfig (Effective key included) for an AI request.
  const buildAiConfig = (): AiConfig => {
    const provider = getProvider();
    return {
      provider,
      baseUrl: (store.get('baseUrl', '') as string) || undefined,
      model: store.get('aiModel', '') as string,
      apiKey: resolveEffectiveKey(provider, store.get('apiKey', '') as string),
    };
  };

  ipcMain.handle('ai:askInsightLens', async (event, question: string) => {
    try {
      const cfg = buildAiConfig();
      if (!cfg.model) {
        return { success: false, error: 'No AI model selected. Please choose a model in Settings.' };
      }

      const systemPrompt = await generateSystemPrompt(cfg.model, cfg.baseUrl || '');
      const text = await complete(
        { system: systemPrompt, user: question, maxTokens: 1000, temperature: 0.1 },
        cfg
      );

      try {
        const parsed = parseJsonResponse<any>(text);
        if (parsed.error) return { success: false, error: parsed.error };
        return { success: true, chartSpec: parsed };
      } catch {
        // Not JSON — treat plain prose as a summary response.
        if (!text.includes('{') && !text.includes('[')) {
          return {
            success: true,
            chartSpec: { chartType: 'summary', title: 'AI Response', data: { sql: '', xAxis: '', yAxis: '' }, insights: text },
          };
        }
        return { success: false, error: 'AI returned an invalid response format. Try asking a simpler question.', message: text };
      }
    } catch (error) {
      const err = error as AiError;
      log.error('AI request error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:generateRecommendations', async (event, surveyId: number) => {
    try {
      const cfg = buildAiConfig();
      if (!cfg.model) {
        return { success: false, error: 'No AI model selected. Please choose a model in Settings.' };
      }

      const courseData = dbHelpers.getCourseRecommendationData(surveyId);
      const capabilities = getModelCapabilities(cfg.model, cfg.baseUrl || '');
      const systemPrompt = buildCourseRecommendationPrompt(courseData, capabilities);
      const text = await complete(
        {
          system: systemPrompt,
          // 5–8 detailed recommendations need room; 2000 truncated the JSON mid-string.
          user: 'Please analyze this survey data and provide course improvement recommendations.',
          maxTokens: 8000,
          temperature: 0.3,
        },
        cfg
      );

      try {
        const parsed = parseJsonResponse<any>(text);
        if (parsed.error) return { success: false, error: parsed.error };
        return { success: true, recommendations: parsed.recommendations || [], summary: parsed.summary || '' };
      } catch (parseErr) {
        log.error('AI recommendation parse error:', parseErr);
        log.error('Raw AI recommendation response:', text);
        return { success: false, error: 'AI returned an invalid response format. Please try again.' };
      }
    } catch (error) {
      const err = error as AiError;
      log.error('AI recommendation error:', err);
      return { success: false, error: err.message };
    }
  });

  // Settings handlers — never returns the resolved key (only whether one exists).
  ipcMain.handle('settings:get', async () => {
    const provider = getProvider();
    return {
      databasePath: store.get('databasePath', path.join(app.getPath('userData'), 'surveys.db')),
      provider,
      baseUrl: store.get('baseUrl', '') as string,
      aiModel: store.get('aiModel', ''),
      showOnboardingOnStartup: store.get('showOnboardingOnStartup', true),
      hasKey: !!resolveEffectiveKey(provider, store.get('apiKey', '') as string),
    };
  });

  // Check if an API key is available from the environment for a provider.
  ipcMain.handle('settings:hasEnvKey', async (event, provider: ProviderId) => {
    return hasEnvKey(provider);
  });

  // Provider catalog for the Settings dropdown (the registry is the single source).
  ipcMain.handle('settings:getProviders', async () => {
    return Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      requiresKey: p.requiresKey,
      defaultBaseUrl: p.defaultBaseUrl,
      custom: p.id === 'custom',
    }));
  });


  // Fetch available models for a provider config (registry-driven).
  ipcMain.handle('settings:fetchModels', async (event, provider: ProviderId, baseUrl: string, apiKey: string) => {
    const cfg: AiConfig = {
      provider,
      baseUrl: baseUrl || undefined,
      model: '',
      apiKey: resolveEffectiveKey(provider, apiKey),
    };
    return await listModels(cfg);
  });

  // Test a provider connection (registry-driven).
  ipcMain.handle('settings:testConnection', async (event, provider: ProviderId, baseUrl: string, apiKey: string) => {
    const cfg: AiConfig = {
      provider,
      baseUrl: baseUrl || undefined,
      model: (store.get('aiModel', '') as string) || '',
      apiKey: resolveEffectiveKey(provider, apiKey),
    };
    return await testConnection(cfg);
  });

  ipcMain.handle('settings:set', async (event, settings: any) => {
    if (settings.databasePath !== undefined) store.set('databasePath', settings.databasePath);
    if (settings.provider !== undefined) store.set('provider', settings.provider);
    if (settings.baseUrl !== undefined) store.set('baseUrl', settings.baseUrl);
    if (settings.apiKey !== undefined) store.set('apiKey', settings.apiKey);
    if (settings.aiModel !== undefined) store.set('aiModel', settings.aiModel);
    if (settings.showOnboardingOnStartup !== undefined) store.set('showOnboardingOnStartup', settings.showOnboardingOnStartup);

    // Return the canonical settings so the renderer can write-through (never includes the key).
    const provider = getProvider();
    return {
      databasePath: store.get('databasePath', path.join(app.getPath('userData'), 'surveys.db')),
      provider,
      baseUrl: store.get('baseUrl', '') as string,
      aiModel: store.get('aiModel', ''),
      showOnboardingOnStartup: store.get('showOnboardingOnStartup', true),
      hasKey: !!resolveEffectiveKey(provider, store.get('apiKey', '') as string),
    };
  });

  // Import surveys handler — loops over files + tallies; the Importer owns each survey.
  //
  // Phase 2: dispatch by detected format. Insight imports persist as before.
  // eValuate imports parse successfully but are tallied as 'pending' until
  // Phase 3 wires the eValuate persistence path (which needs the eValuate
  // questions + survey_event rows seeded first). This is friendlier than
  // marking them as 'failed' — the parse succeeded; the storage just isn't
  // wired yet.
  ipcMain.handle('surveys:import', async (event, filePaths: string[]) => {
    const results = {
      success: 0,
      duplicates: 0,
      failed: 0,
      pending: 0,
      details: [] as any[],
    };

    const db = getDatabase();

    for (const filePath of filePaths) {
      const file = path.basename(filePath);
      try {
        const extractResult = await extractFromPdf(filePath);

        if (!extractResult.success) {
          results.failed++;
          results.details.push({
            file,
            status: 'failed',
            format: extractResult.format,
            error: extractResult.error,
          });
          continue;
        }

        if (extractResult.format === 'evaluate') {
          // Phase 3 will add the seed + persistSurveyEvaluate path. Until
          // then, surface a clear status so the user knows their file was
          // parsed but not yet stored.
          results.pending++;
          const ui = extractResult.data.unit_info;
          results.details.push({
            file,
            status: 'pending',
            format: 'evaluate',
            unit: ui.unit_code,
            period: ui.evaluation_period,
            message:
              'eValuate PDF parsed successfully; database persistence ships in the next update.',
          });
          continue;
        }

        // format === 'insight' — existing path unchanged.
        const outcome = persistSurvey(extractResult.data, db, file);
        if (outcome.status === 'duplicate') {
          results.duplicates++;
          results.details.push({
            file,
            status: 'duplicate',
            format: 'insight',
            unit: outcome.unit,
            period: outcome.period,
          });
        } else {
          results.success++;
          results.details.push({
            file,
            status: 'success',
            format: 'insight',
            unit: outcome.unit,
            period: outcome.period,
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({ file, status: 'failed', error: (error as Error).message });
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

  // Promotion analysis handlers — identifier-based; the Promotion module owns the rich objects.
  ipcMain.handle('promotion:analyzeUnits', async (event, filters: any) => {
    try {
      return { success: true, data: await promotion.findPromotionCandidates(filters) };
    } catch (error) {
      log.error('Promotion analysis error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:getHighPerformers', async (event, minSatisfaction: number = 80) => {
    try {
      return { success: true, data: await promotion.getHighPerformingUnits(minSatisfaction) };
    } catch (error) {
      log.error('Failed to get high performing units:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateReport', async (event, unitCode: string, filters: any) => {
    try {
      return { success: true, data: await promotion.buildPromotionReport(unitCode, filters) };
    } catch (error) {
      log.error('Report generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:generateSummary', async (event, filters: any) => {
    try {
      return { success: true, data: await promotion.buildPromotionSummary(filters) };
    } catch (error) {
      log.error('Summary generation error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('promotion:exportReport', async (event, target: string, format: 'pdf' | 'html' | 'text', filters: any, filename: string) => {
    try {
      const content = await promotion.buildExportContent(target, format, filters);
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
