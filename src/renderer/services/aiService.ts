import { logger } from '../utils/logger';

// All LLM calls go through the main process (the AI Client). This renderer module is a thin
// wrapper over the IPC surface plus the chart-spec execution/validation used by the chat UI.

interface ChartSpec {
  chartType: 'line' | 'bar' | 'table' | 'summary';
  title: string;
  data: {
    sql: string;
    xAxis?: string;
    yAxis?: string;
    series?: string;
    groupBy?: string;
  };
  insights?: string;
}

interface AiResponse {
  success: boolean;
  chartSpec?: ChartSpec;
  error?: string;
  message?: string;
}

export async function askInsightLens(question: string): Promise<AiResponse> {
  logger.debug('askInsightLens called with question:', question);

  try {
    // The main process (AI Client) builds the prompt, calls the provider, and parses the response.
    const response = await window.electronAPI.askInsightLens(question);
    return response;
  } catch (error) {
    logger.error('AI request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Data validation functions
function validateChartData(data: any[], chartSpec: ChartSpec): { isValid: boolean; error?: string; suggestion?: string } {
  // Check if data is empty
  if (!data || data.length === 0) {
    return {
      isValid: false,
      error: 'No data returned from query',
      suggestion: 'Try a broader query or check if survey data has been imported'
    };
  }

  // Check if required columns exist for chart type
  const firstRow = data[0];
  const columnNames = Object.keys(firstRow);

  if (chartSpec.chartType === 'line' || chartSpec.chartType === 'bar') {
    const xAxis = chartSpec.data.xAxis;
    const yAxis = chartSpec.data.yAxis;

    if (xAxis && !columnNames.includes(xAxis)) {
      return {
        isValid: false,
        error: `X-axis column '${xAxis}' not found in query results`,
        suggestion: 'Check the SQL query and ensure column names match'
      };
    }

    if (yAxis && !columnNames.includes(yAxis)) {
      return {
        isValid: false,
        error: `Y-axis column '${yAxis}' not found in query results`,
        suggestion: 'Check the SQL query and ensure column names match'
      };
    }

    // Check if y-axis contains numeric data
    if (yAxis && data.length > 0) {
      const yValue = firstRow[yAxis];
      if (yValue !== null && yValue !== undefined && isNaN(Number(yValue))) {
        return {
          isValid: false,
          error: `Y-axis column '${yAxis}' contains non-numeric data`,
          suggestion: 'Use a table view for non-numeric data or modify the query'
        };
      }
    }
  }

  // Check data size warnings
  if (data.length > 100) {
    logger.warn(`Large dataset (${data.length} rows) - performance may be affected`);
  }

  return { isValid: true };
}

// Enhanced chart execution with validation
export async function executeChartSpec(chartSpec: ChartSpec): Promise<any> {
  try {
    logger.debug('Executing SQL query:', chartSpec.data.sql);

    // Add query timeout and result limit for safety
    const data = await window.electronAPI.queryReadonly(chartSpec.data.sql);
    logger.debug('Query result count:', data?.length);

    // Validate the data
    const validation = validateChartData(data, chartSpec);

    if (!validation.isValid) {
      logger.warn('Chart data validation failed:', validation.error);

      // If data is empty, throw an error
      if (!data || data.length === 0) {
        throw new Error(validation.error + (validation.suggestion ? '. ' + validation.suggestion : ''));
      }

      // For other validation issues, log warning but continue
      logger.warn('Chart validation warning:', validation.error);
    }

    return data;
  } catch (error) {
    logger.error('SQL execution error:', error);
    logger.error('Failed query:', chartSpec.data.sql);
    throw new Error('Failed to execute query: ' + (error as Error).message);
  }
}

// Pre-validate SQL query without executing it
export async function validateQuery(sql: string): Promise<{ isValid: boolean; error?: string; suggestion?: string }> {
  try {
    // Basic SQL syntax checks
    const trimmedSql = sql.trim().toLowerCase();

    if (!trimmedSql.startsWith('select')) {
      return {
        isValid: false,
        error: 'Only SELECT queries are allowed',
        suggestion: 'Modify the query to start with SELECT'
      };
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create'];
    for (const keyword of dangerousKeywords) {
      if (trimmedSql.includes(keyword)) {
        return {
          isValid: false,
          error: `Query contains potentially dangerous keyword: ${keyword}`,
          suggestion: 'Only SELECT queries are allowed for data analysis'
        };
      }
    }

    // Try executing with LIMIT 1 to validate syntax without full execution
    const testQuery = `${sql.replace(/limit\s+\d+/gi, '')} LIMIT 1`;
    await window.electronAPI.queryReadonly(testQuery);

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'SQL syntax error: ' + (error as Error).message,
      suggestion: 'Check the SQL syntax and table names'
    };
  }
}

// Course improvement recommendation interfaces
interface CourseRecommendation {
  category: 'content' | 'delivery' | 'assessment' | 'engagement' | 'support' | 'resources';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  evidence: string[];
  actionSteps: string[];
  impact: string;
}

interface CourseRecommendationResponse {
  success: boolean;
  recommendations?: CourseRecommendation[];
  summary?: string;
  error?: string;
}

// Generate course improvement recommendations. The main process (AI Client) owns the prompt,
// the provider call, and the response parsing; this is a thin wrapper over the IPC channel.
export async function generateCourseRecommendations(surveyId: number): Promise<CourseRecommendationResponse> {
  try {
    return await window.electronAPI.generateRecommendations(surveyId);
  } catch (error) {
    logger.error('Course recommendation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
