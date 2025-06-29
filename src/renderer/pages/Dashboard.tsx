import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { TrendingUp, Users, MessageSquare, AlertCircle, Star, Award } from 'lucide-react';
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

  // Helper function to calculate current 12-month academic period
  const getCurrentAcademicPeriods = (latestYear: number, latestSemester: string) => {
    const periods = [];
    
    // Add the latest semester
    periods.push({ year: latestYear, semester: latestSemester });
    
    // Calculate previous semesters/trimesters for 12-month period
    const semesterMap: { [key: string]: { prev: string[], prevYear: boolean } } = {
      'Semester 1': { prev: ['Semester 2', 'Trimester 3', 'Trimester 2'], prevYear: true },
      'Semester 2': { prev: ['Trimester 3', 'Trimester 2', 'Semester 1'], prevYear: false },
      'Trimester 1': { prev: ['Trimester 3', 'Trimester 2'], prevYear: true },
      'Trimester 2': { prev: ['Trimester 1'], prevYear: false },
      'Trimester 3': { prev: ['Trimester 2', 'Trimester 1'], prevYear: false }
    };
    
    const config = semesterMap[latestSemester];
    if (config) {
      config.prev.forEach(sem => {
        periods.push({ 
          year: config.prevYear && sem.includes('Semester') ? latestYear - 1 : latestYear,
          semester: sem 
        });
      });
    }
    
    return periods;
  };

  // Fetch latest survey to determine current academic period
  const { data: latestSurveyInfo } = useQuery({
    queryKey: ['latest-survey-info'],
    queryFn: async () => {
      const result = await window.electronAPI.queryDatabase(`
        SELECT uo.year, uo.semester
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        ORDER BY uo.year DESC, 
                 CASE uo.semester 
                   WHEN 'Semester 2' THEN 4
                   WHEN 'Trimester 3' THEN 3
                   WHEN 'Trimester 2' THEN 2
                   WHEN 'Trimester 1' THEN 1
                   WHEN 'Semester 1' THEN 1
                   ELSE 0
                 END DESC
        LIMIT 1
      `);
      return result[0];
    }
  });

  // Calculate current academic periods
  const currentPeriods = React.useMemo(() => {
    if (!latestSurveyInfo) return [];
    return getCurrentAcademicPeriods(latestSurveyInfo.year, latestSurveyInfo.semester);
  }, [latestSurveyInfo]);

  // Fetch top performers for current period
  const { data: topPerformers } = useQuery({
    queryKey: ['top-performers', currentPeriods],
    queryFn: async () => {
      if (currentPeriods.length === 0) return [];
      
      const periodConditions = currentPeriods.map(p => 
        `(uo.year = ${p.year} AND uo.semester = '${p.semester}')`
      ).join(' OR ');
      
      return window.electronAPI.queryDatabase(`
        SELECT 
          u.unit_code,
          u.unit_name,
          uo.year,
          uo.semester,
          us.overall_experience,
          us.response_rate,
          d.discipline_name
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        JOIN unit u ON uo.unit_code = u.unit_code
        JOIN discipline d ON u.discipline_code = d.discipline_code
        WHERE (${periodConditions}) AND us.overall_experience >= 85
        ORDER BY us.overall_experience DESC, uo.year DESC, uo.semester DESC
        LIMIT 15
      `);
    },
    enabled: currentPeriods.length > 0
  });

  // Fetch units needing attention for current period
  const { data: unitsNeedingAttention } = useQuery({
    queryKey: ['units-attention', currentPeriods],
    queryFn: async () => {
      if (currentPeriods.length === 0) return [];
      
      const periodConditions = currentPeriods.map(p => 
        `(uo.year = ${p.year} AND uo.semester = '${p.semester}')`
      ).join(' OR ');
      
      return window.electronAPI.queryDatabase(`
        SELECT 
          u.unit_code,
          u.unit_name,
          uo.year,
          uo.semester,
          us.overall_experience,
          us.response_rate,
          d.discipline_name
        FROM unit_survey us
        JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
        JOIN unit u ON uo.unit_code = u.unit_code
        JOIN discipline d ON u.discipline_code = d.discipline_code
        WHERE (${periodConditions}) AND us.overall_experience < 70
        ORDER BY us.overall_experience ASC, uo.year DESC, uo.semester DESC
        LIMIT 15
      `);
    },
    enabled: currentPeriods.length > 0
  });

  // Helper function to group units by semester
  const groupBySemester = (units: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    units.forEach(unit => {
      const key = `${unit.semester} ${unit.year}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(unit);
    });
    return grouped;
  };

  // Group the performance data
  const groupedTopPerformers = React.useMemo(() => 
    topPerformers ? groupBySemester(topPerformers) : {}, [topPerformers]
  );
  
  const groupedUnitsAttention = React.useMemo(() => 
    unitsNeedingAttention ? groupBySemester(unitsNeedingAttention) : {}, [unitsNeedingAttention]
  );

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

      {/* Performance Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-medium text-gray-900">
                Top Performers
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              Last 12 months
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Units with exceptional student satisfaction (≥85%)
          </p>
          
          <div className="space-y-4">
            {Object.keys(groupedTopPerformers).length > 0 ? (
              Object.entries(groupedTopPerformers).map(([period, units]) => (
                <div key={period} className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-yellow-50 transition-colors border border-yellow-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium text-gray-900">{unit.unit_code}</span>
                              <span className="text-green-600 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-gray-500 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No top performers found for current period</p>
              </div>
            )}
          </div>
        </Card>

        {/* Units needing attention */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-medium text-gray-900">
                Units Needing Attention
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              Last 12 months
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Units with lower satisfaction scores (&lt;70%) requiring support
          </p>
          
          <div className="space-y-4">
            {Object.keys(groupedUnitsAttention).length > 0 ? (
              Object.entries(groupedUnitsAttention).map(([period, units]) => (
                <div key={period} className="border-l-4 border-orange-500 pl-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-orange-50 transition-colors border border-orange-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{unit.unit_code}</span>
                              <span className="text-orange-600 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-gray-500 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No units needing attention in current period</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}