// Course-recommendation prompt building. Domain-specific (knows about surveys); the AI Client
// only transports. Moved from the renderer so all LLM calls go through the main process.

export interface ModelCapabilities {
  isLargeModel: boolean;
  isLocal: boolean;
  hasAdvancedReasoning: boolean;
}

/** Coarse capability detection used to size the recommendation prompt. */
export function getModelCapabilities(modelName: string, baseUrl: string): ModelCapabilities {
  const model = (modelName || '').toLowerCase();
  const url = (baseUrl || '').toLowerCase();

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama');

  const isLargeModel =
    model.includes('gpt-4') ||
    model.includes('claude-3') ||
    model.includes('claude-4') ||
    model.includes('opus') ||
    model.includes('sonnet');

  const hasAdvancedReasoning =
    isLargeModel || model.includes('turbo') || model.includes('llama-3') || (!isLocal && !model.includes('mini'));

  return { isLargeModel, isLocal, hasAdvancedReasoning };
}

/** Build the system prompt for course-improvement recommendations from comprehensive survey data. */
export function buildCourseRecommendationPrompt(courseData: any, capabilities: ModelCapabilities): string {
  const { surveyInfo, questionResults, comments, benchmarks, historicalData, sentimentStats } = courseData;

  const contextInfo = `
Course Information:
- Unit: ${surveyInfo.unit_code} - ${surveyInfo.unit_name}
- Discipline: ${surveyInfo.discipline_name}
- Academic Level: ${surveyInfo.academic_level === 'UG' ? 'Undergraduate' : 'Postgraduate'}
- Period: ${surveyInfo.semester} ${surveyInfo.year}
- Location: ${surveyInfo.location} (${surveyInfo.mode})
- Response Rate: ${surveyInfo.response_rate}% (${surveyInfo.responses}/${surveyInfo.enrolments} students)
- Overall Experience: ${surveyInfo.overall_experience}%

Survey Results by Question:
${questionResults.map((q: any) => `- ${q.question_text}: ${q.percent_agree}% agree`).join('\n')}

${benchmarks.length > 0 ? `
Benchmark Comparisons:
${benchmarks.slice(0, 5).map((b: any) => `- ${b.question_short}: Unit ${b.unit_score}% vs ${b.group_description} ${b.benchmark_score}% (${b.difference > 0 ? '+' : ''}${b.difference.toFixed(1)}%)`).join('\n')}
` : ''}

${sentimentStats.totalComments > 0 ? `
Comment Analysis:
- Total Comments: ${sentimentStats.totalComments}
- Average Sentiment: ${sentimentStats.averageSentiment.toFixed(2)} (-1 to 1 scale)
- Positive: ${sentimentStats.positiveCount}, Neutral: ${sentimentStats.neutralCount}, Negative: ${sentimentStats.negativeCount}

Sample Comments:
${comments.slice(0, 5).map((c: any) => `- "${c.comment_text}" (sentiment: ${c.sentiment_label})`).join('\n')}
` : ''}

${historicalData.length > 0 ? `
Historical Performance:
${historicalData.map((h: any) => `- ${h.semester} ${h.year}: ${h.overall_experience}% experience, ${h.response_rate}% response rate`).join('\n')}
` : ''}
`;

  if (capabilities.isLocal && !capabilities.isLargeModel) {
    return `You are a course improvement consultant. Analyze this survey data and provide 3-5 actionable recommendations.

${contextInfo}

CRITICAL: You MUST return ONLY valid JSON in this EXACT format. Do not include any markdown, explanations, or other text:

{
  "recommendations": [
    {
      "category": "content",
      "title": "Brief title",
      "description": "What to improve",
      "priority": "high",
      "evidence": ["Specific survey evidence"],
      "actionSteps": ["Specific action to take"],
      "impact": "Expected outcome"
    }
  ],
  "summary": "Brief overview of key improvement areas"
}

Focus on:
- Lowest scoring survey questions
- Negative comments
- Clear, implementable actions
- Evidence from the survey data

Remember: Return ONLY the JSON object, nothing else.`;
  }

  return `You are an expert educational consultant specializing in course improvement based on student survey data. Your task is to analyze comprehensive survey data and provide evidence-based recommendations for enhancing course delivery.

${contextInfo}

Analysis Framework:
1. Identify specific areas underperforming relative to benchmarks
2. Analyze sentiment patterns in student comments for qualitative insights
3. Compare current performance with historical trends
4. Prioritize recommendations based on impact potential and implementation feasibility
5. Provide specific, actionable steps for each recommendation

Response Requirements:
- Provide 5-8 detailed recommendations across different categories
- Each recommendation must be supported by specific survey evidence
- Include implementation difficulty and expected timeline
- Reference educational best practices where appropriate
- Consider the specific context (academic level, discipline, delivery mode)

CRITICAL: You MUST return ONLY valid JSON in this EXACT format. Do not include any markdown, explanations, or other text:

{
  "recommendations": [
    {
      "category": "content",
      "title": "Specific, actionable title",
      "description": "Detailed explanation of the issue and proposed solution",
      "priority": "high",
      "evidence": ["Specific survey metrics", "Comment themes", "Benchmark comparisons"],
      "actionSteps": ["Concrete step 1", "Concrete step 2", "Concrete step 3"],
      "impact": "Expected improvement in student experience and specific metrics"
    }
  ],
  "summary": "Executive summary highlighting the most critical improvement opportunities and overall strategy"
}

Categories: content, delivery, assessment, engagement, support, resources
Priorities: high, medium, low

Remember: Return ONLY the JSON object, nothing else.`;
}
