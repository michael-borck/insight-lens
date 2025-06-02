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

Common patterns:
- Join unit_survey with unit_offering to get unit details
- Join with unit to get unit names and disciplines
- Use question.question_short for metric names
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
  const settings = useStore.getState().settings;
  
  if (!settings.apiUrl) {
    return {
      success: false,
      error: 'No API URL configured. Please set up your AI settings first.'
    };
  }

  const systemPrompt = `You are InsightLens AI, an expert assistant for analyzing university survey data. 

${DATABASE_SCHEMA}

${CHART_TYPES}

Your task is to:
1. Understand the user's question about survey data
2. Write appropriate SQL queries to get the data
3. Choose the best chart type for visualization
4. Return a JSON response with chart specifications

Response format:
{
  "chartType": "line|bar|pie|radar|table|summary",
  "title": "Descriptive title for the chart",
  "data": {
    "sql": "SELECT statement to get the data",
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }
    
    const response = await fetch(settings.apiUrl + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.error) {
        return { success: false, error: parsed.error };
      }

      return { success: true, chartSpec: parsed };
    } catch (parseError) {
      // If JSON parsing fails, return the raw content as a message
      return {
        success: false,
        error: 'AI returned an invalid response format',
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
    const data = await window.electronAPI.queryDatabase(chartSpec.data.sql);
    return data;
  } catch (error) {
    console.error('SQL execution error:', error);
    throw new Error('Failed to execute query: ' + (error as Error).message);
  }
}