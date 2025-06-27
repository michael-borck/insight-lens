import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Users, Calendar, Lightbulb } from 'lucide-react';
import { Card } from '../components/Card';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { RadarChart } from '../components/charts/RadarChart';
import { WordCloud } from '../components/charts/WordCloud';
import { SentimentChart } from '../components/charts/SentimentChart';
import { CommentWithSentiment } from '../components/CommentWithSentiment';
import { CourseImprovementModal } from '../components/CourseImprovementModal';
import { analyzeSentimentBatch } from '../utils/sentiment';

export function UnitDetail() {
  const { unitCode } = useParams<{ unitCode: string }>();
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);

  // Fetch unit info
  const { data: unitInfo } = useQuery({
    queryKey: ['unit-info', unitCode],
    queryFn: async () => {
      const result = await window.electronAPI.queryDatabase(
        `SELECT u.*, d.discipline_name 
         FROM unit u 
         JOIN discipline d ON u.discipline_code = d.discipline_code 
         WHERE u.unit_code = ?`,
        [unitCode]
      );
      return result[0];
    }
  });

  // Fetch surveys for this unit
  const { data: surveys } = useQuery({
    queryKey: ['unit-surveys', unitCode],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(
        `SELECT us.*, uo.year, uo.semester, uo.location, uo.mode
         FROM unit_survey us
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = ?
         ORDER BY uo.year DESC, uo.semester DESC`,
        [unitCode]
      );
    }
  });

  // Fetch latest survey metrics
  const { data: latestMetrics } = useQuery({
    queryKey: ['unit-latest-metrics', unitCode],
    queryFn: async () => {
      const result = await window.electronAPI.queryDatabase(
        `SELECT 
          q.question_short,
          usr.percent_agree
         FROM unit_survey_result usr
         JOIN question q ON usr.question_id = q.question_id
         JOIN unit_survey us ON usr.survey_id = us.survey_id
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = ?
         ORDER BY us.created_at DESC
         LIMIT 6`,
        [unitCode]
      );
      return result;
    }
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['unit-comments', unitCode],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(
        `SELECT c.*, uo.year, uo.semester
         FROM comment c
         JOIN unit_survey us ON c.survey_id = us.survey_id
         JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
         WHERE uo.unit_code = ?
         ORDER BY c.created_at DESC
         LIMIT 50`,
        [unitCode]
      );
    }
  });

  // Analyze sentiment of comments
  const sentimentData = React.useMemo(() => {
    if (!comments || comments.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, averageScore: 0, distribution: [] };
    }
    
    const commentTexts = comments.map((c: any) => c.comment_text);
    return analyzeSentimentBatch(commentTexts);
  }, [comments]);

  // Generate word cloud data from comments
  const wordCloudData = React.useMemo(() => {
    if (!comments || comments.length === 0) return [];

    // Combine all comments
    const allText = comments.map((c: any) => c.comment_text).join(' ');
    
    // Common words to filter out
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us', 'was', 'are', 'been', 'has', 'had', 'were',
      'said', 'did', 'is', 'am', 'very', 'more', 'much', 'too', 'really'
    ]);

    // Extract words and count frequency
    const wordCount = new Map<string, number>();
    const words = allText.toLowerCase().match(/\b\w+\b/g) || [];
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // Convert to array and sort by frequency
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40) // Top 40 words
      .map(([text, count]) => ({
        text,
        size: Math.sqrt(count) * 15 + 10 // Scale size based on frequency
      }));

    return sortedWords;
  }, [comments]);

  if (!unitInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unit not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900">
          {unitCode} - {unitInfo.unit_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {unitInfo.discipline_name} • {unitInfo.academic_level === 'UG' ? 'Undergraduate' : 'Postgraduate'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Surveys</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {surveys?.length || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {surveys && surveys.length > 0
                  ? (surveys.reduce((sum: number, s: any) => sum + s.response_rate, 0) / surveys.length).toFixed(1)
                  : '0'}%
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Latest Experience</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {surveys && surveys[0]?.overall_experience
                  ? surveys[0].overall_experience.toFixed(1)
                  : '0'}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Course Improvement CTA */}
      {surveys && surveys.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Lightbulb className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Get AI-Powered Course Recommendations
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Analyze your latest survey data to get personalized suggestions for improving course delivery and student experience.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRecommendationModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Generate Recommendations
            </button>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Trend */}
        <Card className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Overall Experience Trend
          </h2>
          {surveys && surveys.length > 1 ? (
            <LineChart
              data={surveys}
              xKey="semester"
              yKey="overall_experience"
              xLabel="Semester"
              yLabel="Experience (%)"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Need more data points for trend
            </div>
          )}
        </Card>

        {/* Metrics Radar */}
        <Card className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Latest Survey Metrics
          </h2>
          {latestMetrics && latestMetrics.length > 0 ? (
            <RadarChart
              data={latestMetrics}
              labelKey="question_short"
              valueKey="percent_agree"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No metrics data available
            </div>
          )}
        </Card>
      </div>

      {/* Survey History */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Survey History
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responses
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {surveys?.map((survey: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {survey.semester} {survey.year}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.location}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.mode}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.responses}/{survey.enrolments}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.response_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {survey.overall_experience.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index === 0 && (
                      <button
                        onClick={() => setIsRecommendationModalOpen(true)}
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        Get Recommendations
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comments Analysis */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          Comments Analysis
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Sentiment Distribution */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Sentiment Distribution</h3>
            <SentimentChart 
              positive={sentimentData.positive}
              neutral={sentimentData.neutral}
              negative={sentimentData.negative}
              showLegend={false}
            />
          </div>
          
          {/* Word Cloud */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Most Frequent Words</h3>
            {wordCloudData.length > 0 ? (
              <WordCloud words={wordCloudData} width={600} height={250} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No comments to analyze
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comments with Sentiment */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Student Comments
          </h2>
          <div className="text-sm text-gray-500">
            {comments?.length || 0} comments
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {comments?.map((comment: any, index: number) => (
            <CommentWithSentiment
              key={index}
              comment={comment.comment_text}
              semester={comment.semester}
              year={comment.year}
              showDetails={false}
            />
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-sm text-gray-500">No comments available</p>
          )}
        </div>
      </Card>

      {/* Course Improvement Modal */}
      {surveys && surveys.length > 0 && (
        <CourseImprovementModal
          isOpen={isRecommendationModalOpen}
          onClose={() => setIsRecommendationModalOpen(false)}
          surveyId={surveys[0].survey_id}
          unitCode={unitCode!}
          unitName={unitInfo?.unit_name || ''}
          semester={surveys[0].semester}
          year={surveys[0].year}
        />
      )}
    </div>
  );
}