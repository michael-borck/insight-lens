import { useStore } from '../utils/store';

interface ChartSpec {
  chartType: 'line' | 'bar' | 'pie' | 'radar' | 'table' | 'summary';
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

const DATABASE_SCHEMA = `
Database Schema:
- unit: unit_code (PK), unit_name, discipline_code, academic_level
- discipline: discipline_code (PK), discipline_name
- unit_offering: unit_offering_id (PK), unit_code, year, semester, location, mode
- unit_survey: survey_id (PK), unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience
- unit_survey_result: result_id (PK), survey_id, question_id, percent_agree, strongly_disagree, disagree, neutral, agree, strongly_agree
- question: question_id (PK), question_text, question_short (engagement, resources, support, assessments, expectations, overall)
- comment: comment_id (PK), survey_id, comment_text, sentiment_score, sentiment_label
- benchmark: benchmark_id (PK), survey_id, question_id, group_type, group_description, percent_agree, response_count

IMPORTANT: 
- sentiment_score and sentiment_label are in the COMMENT table only
- Always use proper table names and aliases in SQL
- Do NOT use undefined table aliases like 'usr'

Common SQL patterns:
- For sentiment over time: 
  SELECT uo.year, uo.semester, AVG(c.sentiment_score) as avg_sentiment
  FROM comment c 
  JOIN unit_survey us ON c.survey_id = us.survey_id
  JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
  GROUP BY uo.year, uo.semester
  ORDER BY uo.year, uo.semester

- For unit details:
  JOIN unit_survey us ON us.survey_id = target_table.survey_id
  JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id  
  JOIN unit u ON uo.unit_code = u.unit_code

- sentiment_score ranges from -1 to 1, sentiment_label is 'positive', 'neutral', or 'negative'
`;

const CHART_TYPES = `
Available chart types:
- line: For trends over time (requires x/y axes)
- bar: For comparisons (requires categories and values)
- pie: For distributions (requires labels and values)
- radar: For multi-dimensional comparisons (requires multiple metrics)
- table: For detailed data listing
- summary: For simple statistics or insights
`;

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

  const systemPrompt = `You are InsightLens AI, an expert assistant for analyzing university survey data. 

${DATABASE_SCHEMA}

${CHART_TYPES}

Your task is to:
1. Understand the user's question about survey data
2. Write CORRECT SQL queries using the exact table names and columns from the schema
3. Choose the best chart type for visualization
4. Return a JSON response with chart specifications

CRITICAL SQL RULES:
- Use ONLY the table names and columns listed in the schema
- NEVER use undefined table aliases like 'usr'
- For sentiment data, ALWAYS use the comment table: comment.sentiment_score, comment.sentiment_label
- Follow the provided SQL patterns exactly
- Test your SQL logic before returning

Response format:
{
  "chartType": "line|bar|pie|radar|table|summary",
  "title": "Descriptive title for the chart",
  "data": {
    "sql": "SELECT statement using CORRECT table names and joins",
    "xAxis": "column name for x-axis (if applicable)",
    "yAxis": "column name for y-axis (if applicable)",
    "series": "column name for series/grouping (if applicable)"
  },
  "insights": "Brief explanation of what the data shows"
}

If the question cannot be answered with available data, return:
{
  "error": "Explanation of why the question cannot be answered"
}

Examples of good questions:
- "Show me units with declining satisfaction scores"
- "Which units have the best engagement scores?"
- "How has sentiment changed over time?"
- "Compare response rates across campuses"

Be helpful and suggest related queries if the question is unclear.`;

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

// Execute the chart specification and return data
export async function executeChartSpec(chartSpec: ChartSpec): Promise<any> {
  try {
    console.log('Executing SQL query:', chartSpec.data.sql);
    const data = await window.electronAPI.queryDatabase(chartSpec.data.sql);
    console.log('Query result:', data);
    return data;
  } catch (error) {
    console.error('SQL execution error:', error);
    console.error('Failed query:', chartSpec.data.sql);
    throw new Error('Failed to execute query: ' + (error as Error).message);
  }
}