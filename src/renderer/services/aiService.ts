import { useStore } from '../utils/store';

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

// Database schema and patterns will be dynamically generated with actual data context
async function generateDatabaseContext(): Promise<string> {
  try {
    const [stats, sampleData, availability] = await Promise.all([
      window.electronAPI.getDatabaseStats(),
      window.electronAPI.getSampleData(),
      window.electronAPI.getDataAvailability()
    ]);

    const hasData = stats.totalSurveys.count > 0;
    const dataWarning = !hasData ? "\n⚠️  WARNING: Database appears to be empty or has very limited data. Inform the user that they need to import survey data first.\n" : "";

    return `
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
Available Disciplines: ${availability.availableDisciplines.join(', ')}

Sample Data Examples:
${sampleData.sampleUnits.length > 0 ? `Units: ${sampleData.sampleUnits.map((u: any) => `${u.unit_code} (${u.unit_name})`).join(', ')}` : 'No units available'}
${sampleData.sampleSurveyData.length > 0 ? `Recent Surveys: ${sampleData.sampleSurveyData.map((s: any) => `${s.unit_code} ${s.year}-${s.semester} (${s.overall_experience}% satisfaction)`).join(', ')}` : 'No survey data available'}

CRITICAL RULES:
- sentiment_score and sentiment_label are in the COMMENT table only
- Always use proper table names and aliases in SQL
- Do NOT use undefined table aliases like 'usr'
- Always check if data exists before creating visualizations
- sentiment_score ranges from -1 to 1, sentiment_label is 'positive', 'neutral', or 'negative'
`;
  } catch (error) {
    console.error('Failed to get database context:', error);
    return `
Database Schema (Basic):
⚠️  Could not load current database statistics. Database may be empty or unavailable.

- unit: unit_code (PK), unit_name, discipline_code, academic_level
- discipline: discipline_code (PK), discipline_name  
- unit_offering: unit_offering_id (PK), unit_code, year, semester, location, mode
- unit_survey: survey_id (PK), unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience
- unit_survey_result: result_id (PK), survey_id, question_id, percent_agree, strongly_disagree, disagree, neutral, agree, strongly_agree
- question: question_id (PK), question_text, question_short (engagement, resources, support, assessments, expectations, overall)
- comment: comment_id (PK), survey_id, comment_text, sentiment_score, sentiment_label
- benchmark: benchmark_id (PK), survey_id, question_id, group_type, group_description, percent_agree, response_count

Please inform the user they may need to import survey data first.
`;
  }
}

// Model capability detection
function getModelCapabilities(modelName: string, apiUrl: string): { isLargeModel: boolean; isLocal: boolean; hasAdvancedReasoning: boolean } {
  const model = modelName.toLowerCase();
  const url = apiUrl.toLowerCase();
  
  // Local models (typically smaller)
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama');
  
  // Large commercial models with advanced reasoning
  const isLargeModel = model.includes('gpt-4') || 
                       model.includes('claude-3') || 
                       model.includes('claude-4') ||
                       model.includes('opus') ||
                       model.includes('sonnet');
  
  // Models with strong reasoning capabilities
  const hasAdvancedReasoning = isLargeModel || 
                              model.includes('turbo') ||
                              model.includes('llama-3') ||
                              (!isLocal && !model.includes('mini'));

  return { isLargeModel, isLocal, hasAdvancedReasoning };
}

// Query templates for common patterns
const QUERY_TEMPLATES = {
  unitTrends: `
SELECT 
  u.unit_code,
  u.unit_name,
  uo.year,
  uo.semester,
  us.overall_experience,
  us.response_rate
FROM unit_survey us
JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
JOIN unit u ON uo.unit_code = u.unit_code
ORDER BY uo.year DESC, uo.semester DESC`,

  sentimentOverTime: `
SELECT 
  uo.year,
  uo.semester,
  AVG(c.sentiment_score) as avg_sentiment,
  COUNT(c.comment_id) as comment_count
FROM comment c 
JOIN unit_survey us ON c.survey_id = us.survey_id
JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
WHERE c.sentiment_score IS NOT NULL
GROUP BY uo.year, uo.semester
ORDER BY uo.year, uo.semester`,

  topPerformingUnits: `
SELECT 
  u.unit_code,
  u.unit_name,
  AVG(us.overall_experience) as avg_satisfaction,
  COUNT(us.survey_id) as survey_count
FROM unit_survey us
JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
JOIN unit u ON uo.unit_code = u.unit_code
GROUP BY u.unit_code, u.unit_name
HAVING COUNT(us.survey_id) > 1
ORDER BY avg_satisfaction DESC`
};

function generateChartTypeGuidance(capabilities: { isLargeModel: boolean; isLocal: boolean; hasAdvancedReasoning: boolean }): string {
  if (capabilities.isLocal && !capabilities.isLargeModel) {
    // For small local models, keep it simple
    return `
Available chart types (choose the SIMPLEST appropriate option):
- table: For detailed data listing (RECOMMENDED for most queries)
- bar: For simple comparisons (use only when you have clear categories and values)
- line: For trends over time (use only when you have time series data)

IMPORTANT FOR SMALL MODELS:
- Default to "table" when in doubt
- Only use "bar" or "line" when the data clearly fits that format
- Avoid complex aggregations or joins unless absolutely necessary
`;
  } else if (capabilities.hasAdvancedReasoning) {
    // For advanced models, provide full capabilities
    return `
Available chart types:
- line: For trends over time (requires x/y axes with temporal data)
- bar: For comparisons (requires categories and values) 
- table: For detailed data listing (always safe fallback)
- summary: For simple statistics or insights when no chart is appropriate

Advanced Guidelines:
- Choose chart type based on data structure and user intent
- Use "summary" for questions that don't require visualization
- Always validate that your chosen axes exist in the query results
- Consider the story you want to tell with the data
`;
  } else {
    // For mid-tier models
    return `
Available chart types:
- table: For detailed data listing (safest option)
- bar: For comparisons between categories
- line: For trends over time
- summary: For insights without charts

Guidelines:
- Prefer "table" for complex queries or when unsure
- Use "bar" for clear category comparisons
- Use "line" only for time series data
`;
  }
}

async function generateSystemPrompt(modelName: string, apiUrl: string): Promise<string> {
  const capabilities = getModelCapabilities(modelName, apiUrl);
  const databaseContext = await generateDatabaseContext();
  const chartGuidance = generateChartTypeGuidance(capabilities);
  
  if (capabilities.isLocal && !capabilities.isLargeModel) {
    // Simplified prompt for small local models
    return `You are InsightLens AI. Help analyze university survey data.

${databaseContext}

${chartGuidance}

Keep it SIMPLE:
1. Read the user's question carefully
2. Write a basic SQL query using the exact table names above
3. Choose "table" as chart type unless clearly asked for a specific visualization
4. Return JSON only - no extra text

Template queries you can adapt:
- Unit satisfaction: SELECT u.unit_code, us.overall_experience FROM unit_survey us JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id JOIN unit u ON uo.unit_code = u.unit_code
- Comments by sentiment: SELECT sentiment_label, COUNT(*) as count FROM comment GROUP BY sentiment_label

JSON format:
{
  "chartType": "table",
  "title": "Simple descriptive title",
  "data": {
    "sql": "Your SQL query here",
    "xAxis": "column_name_if_chart",
    "yAxis": "column_name_if_chart"
  },
  "insights": "Brief explanation"
}

If no data available, return: {"error": "No survey data available. Please import survey data first."}`;
  } else {
    // Full-featured prompt for advanced models
    return `You are InsightLens AI, an expert assistant for analyzing university survey data.

${databaseContext}

${chartGuidance}

Your expertise includes:
1. Understanding complex survey data relationships
2. Writing optimized SQL queries with proper joins
3. Selecting appropriate visualizations for different data types
4. Providing meaningful insights about survey trends

Advanced SQL Patterns:
${Object.entries(QUERY_TEMPLATES).map(([name, query]) => `${name}:\n${query}`).join('\n\n')}

Response Strategy:
1. Analyze the user's question for intent and data requirements
2. Check if sufficient data exists for the requested analysis
3. Write efficient SQL with proper table joins and aliases
4. Select the most appropriate chart type for the data structure
5. Provide contextual insights based on the results

CRITICAL VALIDATION:
- Always verify column names exist in your SQL results
- Ensure x/y axes match actual column names from your query
- Default to "table" if visualization would be unclear
- Include data availability warnings when relevant

Response format:
{
  "chartType": "line|bar|table|summary",
  "title": "Descriptive title that tells the story",
  "data": {
    "sql": "SELECT statement with CORRECT table names and joins",
    "xAxis": "exact_column_name_from_select",
    "yAxis": "exact_column_name_from_select",
    "series": "grouping_column_if_applicable"
  },
  "insights": "Contextual analysis of what the data reveals"
}

For insufficient data: {"error": "Specific explanation of data limitations with suggestions"}

Example questions you can handle:
- "Show me units with declining satisfaction scores"
- "Which campus has the best response rates?"
- "How has sentiment changed over time?"
- "Compare engagement scores across disciplines"`;
  }
}

export async function askInsightLens(question: string): Promise<AiResponse> {
  const { settings, settingsLoaded } = useStore.getState();
  
  // Wait for settings to be loaded
  if (!settingsLoaded) {
    return {
      success: false,
      error: 'Settings are still loading. Please wait a moment and try again.'
    };
  }
  
  if (!settings.apiUrl) {
    return {
      success: false,
      error: 'No API URL configured. Please set up your AI settings first.'
    };
  }
  
  if (!settings.apiKey && settings.apiUrl.includes('openai.com')) {
    return {
      success: false,
      error: 'API key is required for OpenAI. Please configure your API key in Settings.'
    };
  }

  const systemPrompt = await generateSystemPrompt(settings.aiModel, settings.apiUrl);

  try {
    const isAnthropic = settings.apiUrl.includes('anthropic.com');
    
    // Ensure proper API URL formatting
    let baseUrl = settings.apiUrl;
    if (!baseUrl.endsWith('/v1') && !isAnthropic) {
      baseUrl += '/v1';
    }
    if (!baseUrl.endsWith('/v1') && isAnthropic) {
      baseUrl += '/v1';
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (settings.apiKey) {
      if (isAnthropic) {
        headers['x-api-key'] = settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
      }
    }
    
    const endpoint = isAnthropic ? '/messages' : '/chat/completions';
    const fullUrl = baseUrl + endpoint;
    console.log('Making AI request to:', fullUrl);
    console.log('Using model:', settings.aiModel);
    console.log('Has API key:', !!settings.apiKey);
    console.log('Is Anthropic:', isAnthropic);
    
    let requestBody: any;
    
    if (isAnthropic) {
      // Anthropic format
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
      // OpenAI format
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
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: fullUrl,
        model: settings.aiModel
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorText ? '. ' + errorText : ''}`);
    }

    const data = await response.json();
    console.log('AI response data:', data);
    
    let content: string;
    
    if (isAnthropic) {
      // Anthropic response format
      content = data.content?.[0]?.text;
    } else {
      // OpenAI response format
      content = data.choices?.[0]?.message?.content;
    }

    if (!content) {
      console.error('No content in AI response:', data);
      throw new Error('No response from AI');
    }
    
    console.log('AI response content:', content);

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.error) {
        return { success: false, error: parsed.error };
      }

      return { success: true, chartSpec: parsed };
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw content:', content);
      // If JSON parsing fails, return the raw content as a message
      return {
        success: false,
        error: `AI returned an invalid response format: ${(parseError as Error).message}`,
        message: content
      };
    }

  } catch (error) {
    console.error('AI request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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
    console.warn(`Large dataset (${data.length} rows) - performance may be affected`);
  }

  return { isValid: true };
}

function generateFallbackChartSpec(originalSpec: ChartSpec, data: any[]): ChartSpec {
  // Default to table view with first few columns
  const firstRow = data[0] || {};
  const columns = Object.keys(firstRow);
  
  return {
    chartType: 'table',
    title: originalSpec.title + ' (Table View)',
    data: {
      sql: originalSpec.data.sql,
      xAxis: columns[0],
      yAxis: columns[1]
    },
    insights: 'Showing data in table format due to visualization constraints. ' + (originalSpec.insights || '')
  };
}

// Enhanced chart execution with validation
export async function executeChartSpec(chartSpec: ChartSpec): Promise<any> {
  try {
    console.log('Executing SQL query:', chartSpec.data.sql);
    
    // Add query timeout and result limit for safety
    const data = await window.electronAPI.queryDatabase(chartSpec.data.sql);
    console.log('Query result:', data);
    
    // Validate the data
    const validation = validateChartData(data, chartSpec);
    
    if (!validation.isValid) {
      console.warn('Chart data validation failed:', validation.error);
      
      // If data is empty, throw an error
      if (!data || data.length === 0) {
        throw new Error(validation.error + (validation.suggestion ? '. ' + validation.suggestion : ''));
      }
      
      // For other validation issues, log warning but continue
      console.warn('Chart validation warning:', validation.error);
    }
    
    return data;
  } catch (error) {
    console.error('SQL execution error:', error);
    console.error('Failed query:', chartSpec.data.sql);
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
    await window.electronAPI.queryDatabase(testQuery);
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'SQL syntax error: ' + (error as Error).message,
      suggestion: 'Check the SQL syntax and table names'
    };
  }
}