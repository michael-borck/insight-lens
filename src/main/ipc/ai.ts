import { ipcMain } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import { dbHelpers, getDatabase, runReadonlySelect } from '../database';
import { complete, parseJsonResponse, AiError } from '../ai/client';
import { getModelCapabilities, buildCourseRecommendationPrompt } from '../ai/recommendations';
import { THEMES, buildThemeSummaryPrompt } from '../themes';
import { getThemeComments } from '../queries/themes';
import { buildAiConfig } from './aiConfig';

// AI service handlers
export function registerAiHandlers(store: Store) {
  ipcMain.handle('ai:askInsightLens', async (event, question: string) => {
    try {
      const cfg = buildAiConfig(store);
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
        // Execute the spec's AI-authored SQL here, on the hardened read-only
        // channel (read-only connection, single SELECT, row cap). The renderer
        // has no SQL channel at all — it only ever receives the result rows.
        if (parsed?.data?.sql) {
          try {
            return { success: true, chartSpec: parsed, chartData: runReadonlySelect(parsed.data.sql) };
          } catch (sqlError) {
            log.error('Chart SQL execution error:', sqlError);
            return { success: true, chartSpec: parsed, chartError: (sqlError as Error).message };
          }
        }
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
      const cfg = buildAiConfig(store);
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

  ipcMain.handle(
    'ai:summarizeTheme',
    async (event, theme: string, filters: { year?: number; discipline?: string } = {}) => {
      try {
        const cfg = buildAiConfig(store);
        if (!cfg.model) {
          return { success: false, error: 'No AI model selected. Please choose a model in Settings.' };
        }

        const comments = getThemeComments(getDatabase(), {
          theme,
          year: filters.year,
          discipline: filters.discipline,
          limit: 100,
        });
        if (comments.length === 0) {
          return { success: false, error: 'No comments found for this theme.' };
        }

        const themeName = THEMES.find((t) => t.key === theme)?.name ?? theme;
        const { system, user } = buildThemeSummaryPrompt(themeName, comments);
        // The response is prose, not JSON — return it verbatim.
        const text = await complete({ system, user, maxTokens: 1000, temperature: 0.3 }, cfg);
        return { success: true, summary: text };
      } catch (error) {
        const err = error as AiError;
        log.error('AI theme summary error:', err);
        return { success: false, error: err.message };
      }
    }
  );
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
