import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { TrendingUp, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { QuickInsights } from '../components/QuickInsights';
import { QuickInsightPreview } from '../components/QuickInsightPreview';
import { AiChatPreview } from '../components/AiChatPreview';

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const insightType = searchParams.get('insight') as 'trending-up' | 'need-attention' | null;

  // Fetch summary statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const result = await window.electronAPI.queryDatabase(`
        SELECT 
          COUNT(DISTINCT u.unit_code) as total_units,
          COUNT(DISTINCT us.survey_id) as total_surveys,
          AVG(us.response_rate) as avg_response_rate,
          COUNT(DISTINCT c.comment_id) as total_comments
        FROM unit u
        LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
        LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        LEFT JOIN comment c ON us.survey_id = c.survey_id
      `);
      return result[0];
    }
  });

  // Fetch recent surveys
  const { data: recentSurveys } = useQuery({
    queryKey: ['recent-surveys'],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(`
        SELECT 
          u.unit_code,
          u.unit_name,
          uo.year,
          uo.semester,
          us.responses,
          us.response_rate,
          us.overall_experience
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        JOIN unit u ON uo.unit_code = u.unit_code
        ORDER BY us.created_at DESC
        LIMIT 10
      `);
    }
  });

  // Fetch trend data
  const { data: trendData } = useQuery({
    queryKey: ['experience-trend'],
    queryFn: async () => {
      return window.electronAPI.queryDatabase(`
        SELECT 
          uo.year,
          uo.semester,
          AVG(us.overall_experience) as avg_experience
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        GROUP BY uo.year, uo.semester
        ORDER BY uo.year, uo.semester
        LIMIT 8
      `);
    }
  });

  // If a quick insight is selected, show that instead
  if (insightType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Quick insights into your survey data
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Back to Overview
          </Link>
        </div>
        <QuickInsights type={insightType} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your unit survey data and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Units</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.total_units || 0}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Surveys</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.total_surveys || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.avg_response_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Comments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.total_comments || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Overall Experience Trend
          </h2>
          {trendData && trendData.length > 0 ? (
            <LineChart
              data={trendData}
              xKey="semester"
              yKey="avg_experience"
              xLabel="Semester"
              yLabel="Average Experience (%)"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Surveys
            </h2>
            <Link
              to="/units"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View All Units
            </Link>
          </div>
          <div className="space-y-3">
            {recentSurveys?.slice(0, 5).map((survey: any, index: number) => (
              <Link
                key={index}
                to={`/unit/${survey.unit_code}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{survey.unit_code}</p>
                    <p className="text-sm text-gray-500">
                      {survey.semester} {survey.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {survey.overall_experience?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {survey.responses} responses
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* AI Chat Preview */}
        <AiChatPreview />
      </div>

      {/* Units needing attention */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-medium text-gray-900">
              Units Needing Attention
            </h2>
          </div>
          <Link
            to="/?insight=need-attention"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View All
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Units with low satisfaction scores or declining trends
        </p>
        <QuickInsightPreview />
      </Card>
    </div>
  );
}