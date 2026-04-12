import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { TrendingUp, Users, MessageSquare, AlertCircle, Star, Award, Download, FileText, Upload, Bot } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { QuickInsights } from '../components/QuickInsights';
import { QuickInsightPreview } from '../components/QuickInsightPreview';
import { AiChatPreview } from '../components/AiChatPreview';
import { 
  exportStarPerformersCSV, 
  exportStarPerformersMarkdown,
  exportUnitsNeedingAttentionCSV,
  exportUnitsNeedingAttentionMarkdown,
  type PerformanceUnit 
} from '../utils/performanceExports';

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

  // Export handlers
  const handleExportStarPerformers = (format: 'csv' | 'markdown') => {
    if (!topPerformers || topPerformers.length === 0) return;
    
    const performanceUnits: PerformanceUnit[] = topPerformers.map(unit => ({
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      year: unit.year,
      semester: unit.semester,
      overall_experience: unit.overall_experience,
      response_rate: unit.response_rate,
      discipline_name: unit.discipline_name
    }));

    if (format === 'csv') {
      exportStarPerformersCSV(performanceUnits);
    } else {
      exportStarPerformersMarkdown(performanceUnits);
    }
  };

  const handleExportUnitsNeedingAttention = (format: 'csv' | 'markdown') => {
    if (!unitsNeedingAttention || unitsNeedingAttention.length === 0) return;
    
    const performanceUnits: PerformanceUnit[] = unitsNeedingAttention.map(unit => ({
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      year: unit.year,
      semester: unit.semester,
      overall_experience: unit.overall_experience,
      response_rate: unit.response_rate,
      discipline_name: unit.discipline_name
    }));

    if (format === 'csv') {
      exportUnitsNeedingAttentionCSV(performanceUnits);
    } else {
      exportUnitsNeedingAttentionMarkdown(performanceUnits);
    }
  };

  // If a quick insight is selected, show that instead
  if (insightType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif text-primary-800">Dashboard</h1>
            <p className="mt-1 text-sm text-primary-600">
              Quick insights into your survey data
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-success-500 hover:text-success-700"
          >
            Back to Overview
          </Link>
        </div>
        <QuickInsights type={insightType} />
      </div>
    );
  }

  // Empty state for first-time users
  const hasData = stats && (stats.total_units > 0 || stats.total_surveys > 0);

  if (stats && !hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif text-primary-800">Welcome to InsightLens</h1>
          <p className="mt-1 text-sm text-primary-600">
            Your survey analysis tool — let's get started
          </p>
        </div>

        <Card className="p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-700" />
            </div>
            <h2 className="text-xl font-semibold font-serif text-primary-800 mb-2">Import your first survey</h2>
            <p className="text-primary-600 mb-6">
              Drag and drop your Insight Survey PDF reports to start analysing student feedback, satisfaction trends, and comments.
            </p>
            <Link to="/import">
              <Button size="lg" className="inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Surveys
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-700" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 text-sm">Track trends</h3>
                <p className="text-xs text-primary-600 mt-1">See how satisfaction scores change over semesters</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-success-50 rounded-lg flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-success-500" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 text-sm">Analyse comments</h3>
                <p className="text-xs text-primary-600 mt-1">Understand student sentiment and common themes</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-warning-50 rounded-lg flex-shrink-0">
                <Bot className="w-5 h-5 text-warning-500" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 text-sm">Ask questions</h3>
                <p className="text-xs text-primary-600 mt-1">Chat with your data using natural language</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary-800">Dashboard</h1>
        <p className="mt-1 text-sm text-primary-600">
          Overview of your unit survey data and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Total Units</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800">
                {stats?.total_units || 0}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Total Surveys</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800">
                {stats?.total_surveys || 0}
              </p>
            </div>
            <div className="p-3 bg-success-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Avg Response Rate</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800">
                {stats?.avg_response_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Total Comments</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800">
                {stats?.total_comments || 0}
              </p>
            </div>
            <div className="p-3 bg-warning-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-warning-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium text-primary-800 font-serif mb-4">
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
            <div className="h-64 flex items-center justify-center text-primary-600">
              No trend data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-primary-800 font-serif">
              Recent Surveys
            </h2>
            <Link
              to="/units"
              className="text-sm text-success-500 hover:text-success-700"
            >
              View All Units
            </Link>
          </div>
          <div className="space-y-3">
            {recentSurveys?.slice(0, 5).map((survey: any, index: number) => (
              <Link
                key={index}
                to={`/unit/${survey.unit_code}`}
                className="block p-3 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-800">{survey.unit_code}</p>
                    <p className="text-sm text-primary-600">
                      {survey.semester} {survey.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-800">
                      {survey.overall_experience?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-primary-600">
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
              <Star className="w-5 h-5 text-primary-300" />
              <h2 className="text-lg font-medium text-primary-800 font-serif">
                Top Performers
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {topPerformers && topPerformers.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => handleExportStarPerformers('csv')}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    title="Export to CSV"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => handleExportStarPerformers('markdown')}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    title="Export to Markdown Report"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </Button>
                </div>
              )}
              <span className="text-xs text-primary-600">
                Last 12 months
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-primary-600">
              Units with exceptional student satisfaction (≥85%)
            </p>
            <div className="flex items-center gap-2">
              {topPerformers && topPerformers.length > 0 && (
                <p className="text-xs text-primary-600 font-medium">
                  {topPerformers.length} total units
                </p>
              )}
              <Link
                to="/reports?type=star-performers"
                className="text-xs text-success-500 hover:text-success-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {Object.keys(groupedTopPerformers).length > 0 ? (
              Object.entries(groupedTopPerformers).map(([period, units]) => (
                <div key={period} className="border-l-4 border-primary-300 pl-4">
                  <h4 className="text-sm font-medium text-primary-800 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-primary-50 transition-colors border border-primary-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-primary-300" />
                              <span className="font-medium text-primary-800">{unit.unit_code}</span>
                              <span className="text-success-500 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-primary-600 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-primary-600 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-primary-600">
                <Star className="w-8 h-8 mx-auto mb-2 text-primary-300" />
                <p>No top performers found for current period</p>
              </div>
            )}
          </div>
        </Card>

        {/* Units needing attention */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning-500" />
              <h2 className="text-lg font-medium text-primary-800 font-serif">
                Units Needing Attention
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {unitsNeedingAttention && unitsNeedingAttention.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => handleExportUnitsNeedingAttention('csv')}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    title="Export to CSV"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => handleExportUnitsNeedingAttention('markdown')}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    title="Export to Markdown Report"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </Button>
                </div>
              )}
              <span className="text-xs text-primary-600">
                Last 12 months
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-primary-600">
              Units with lower satisfaction scores (&lt;70%) requiring support
            </p>
            <div className="flex items-center gap-2">
              {unitsNeedingAttention && unitsNeedingAttention.length > 0 && (
                <p className="text-xs text-primary-600 font-medium">
                  {unitsNeedingAttention.length} total units
                </p>
              )}
              <Link
                to="/reports?type=needs-attention"
                className="text-xs text-success-500 hover:text-success-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {Object.keys(groupedUnitsAttention).length > 0 ? (
              Object.entries(groupedUnitsAttention).map(([period, units]) => (
                <div key={period} className="border-l-4 border-warning-500 pl-4">
                  <h4 className="text-sm font-medium text-primary-800 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-warning-50 transition-colors border border-warning-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary-800">{unit.unit_code}</span>
                              <span className="text-warning-500 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-primary-600 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-primary-600 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-primary-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-primary-300" />
                <p>No units needing attention in current period</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}