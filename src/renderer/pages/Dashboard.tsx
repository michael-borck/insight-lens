import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TrendingUp, Users, MessageSquare, AlertCircle, Star, Award, Download, FileText, Upload, Bot, Pin, RefreshCw, X } from 'lucide-react';
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
import { queries } from '../services/queries';
import type { PinnedChartMeta } from '@shared/types';

// Lightweight skeleton block used while dashboard sections load. Each
// placeholder holds roughly the final dimensions of its section so the
// page doesn't reflow as queries land.
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-primary-200 dark:bg-primary-800 ${className}`} aria-hidden="true" />;
}

// One pinned AI chart. The renderer only holds the pin's id and SQL-stripped
// spec (chartType/title/axes); the main process re-executes the stored SQL
// when we ask for it by id ('charts:execute').
function PinnedChartCard({ pin }: { pin: PinnedChartMeta }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['pinned-chart', pin.id],
    queryFn: async () => {
      const result = await window.electronAPI.executePinnedChart(pin.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pinned-chart', pin.id] });
  };

  const handleUnpin = async () => {
    try {
      await window.electronAPI.unpinChart(pin.id);
      queryClient.invalidateQueries({ queryKey: ['pinned-charts'] });
      toast.success('Chart unpinned');
    } catch (err) {
      toast.error(`Failed to unpin chart: ${(err as Error).message}`);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center bg-primary-50 dark:bg-primary-950 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-700">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-warning-500 dark:text-warning-300" />
          <p className="text-sm text-primary-600 dark:text-primary-300">
            Couldn't load this chart: {(error as Error).message}
          </p>
        </div>
      );
    }

    const rows = data ?? [];
    const { chartType, data: axes } = pin.spec;

    if (chartType === 'line') {
      return (
        <LineChart
          data={rows}
          xKey={axes.xAxis || ''}
          yKey={axes.yAxis || ''}
          xLabel={axes.xAxis}
          yLabel={axes.yAxis}
        />
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart
          data={rows}
          xKey={axes.xAxis || ''}
          yKey={axes.yAxis || ''}
          xLabel={axes.xAxis}
          yLabel={axes.yAxis}
        />
      );
    }

    // Table (the only other pinnable type) — same rendering as the chat UIs.
    if (rows.length === 0) {
      return (
        <div className="p-6 text-center bg-primary-50 dark:bg-primary-950 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-700">
          <p className="text-sm text-primary-600 dark:text-primary-300">No rows found for this query</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary-200 dark:divide-primary-700">
          <thead className="bg-primary-50 dark:bg-primary-950">
            <tr>
              {Object.keys(rows[0] || {}).map((key) => (
                <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-primary-900 divide-y divide-primary-200 dark:divide-primary-700">
            {rows.slice(0, 10).map((row: any, idx: number) => (
              <tr key={idx}>
                {Object.values(row).map((value: any, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-3 whitespace-nowrap text-sm text-primary-800 dark:text-primary-100">
                    {typeof value === 'number' ? value.toFixed(1) : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 10 && (
          <p className="text-sm text-primary-600 dark:text-primary-300 mt-2">
            Showing first 10 of {rows.length} results
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">{pin.spec.title}</h3>
          {pin.question && (
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">In response to: "{pin.question}"</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh chart"
            aria-label="Refresh chart"
            className="p-1.5 text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800 rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleUnpin}
            title="Unpin from Dashboard"
            aria-label="Unpin from Dashboard"
            className="p-1.5 text-primary-400 hover:text-error-500 dark:hover:text-error-300 hover:bg-primary-50 dark:hover:bg-primary-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {renderBody()}
    </Card>
  );
}

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const insightType = searchParams.get('insight') as 'trending-up' | 'need-attention' | null;

  // Fetch summary statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      return queries.dashboardSummary();
    }
  });

  // Fetch recent surveys
  const { data: recentSurveys, isLoading: recentSurveysLoading } = useQuery({
    queryKey: ['recent-surveys'],
    queryFn: async () => {
      return queries.recentSurveys();
    }
  });

  // Fetch trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['experience-trend'],
    queryFn: async () => {
      return queries.experienceTrend();
    }
  });

  // Pinned AI charts (metadata only — SQL never reaches the renderer).
  const { data: pinnedCharts } = useQuery({
    queryKey: ['pinned-charts'],
    queryFn: async () => {
      return window.electronAPI.listPinnedCharts();
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
  const { data: latestSurveyInfo, isLoading: latestInfoLoading } = useQuery({
    queryKey: ['latest-survey-info'],
    queryFn: async () => {
      return queries.latestPeriod();
    }
  });

  // Calculate current academic periods
  const currentPeriods = React.useMemo(() => {
    if (!latestSurveyInfo) return [];
    return getCurrentAcademicPeriods(latestSurveyInfo.year, latestSurveyInfo.semester);
  }, [latestSurveyInfo]);

  // Fetch top performers for current period
  const { data: topPerformers, isLoading: topPerformersLoading } = useQuery({
    queryKey: ['top-performers', currentPeriods],
    queryFn: async () => {
      if (currentPeriods.length === 0) return [];
      return queries.topPerformers(currentPeriods);
    },
    enabled: currentPeriods.length > 0
  });

  // Fetch units needing attention for current period
  const { data: unitsNeedingAttention, isLoading: attentionLoading } = useQuery({
    queryKey: ['units-attention', currentPeriods],
    queryFn: async () => {
      if (currentPeriods.length === 0) return [];
      return queries.needsAttentionByPeriod(currentPeriods);
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
            <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Dashboard</h1>
            <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
              Quick insights into your survey data
            </p>
          </div>
          <Link
            to="/"
            className="text-sm text-success-500 dark:text-success-300 hover:text-success-700 dark:hover:text-success-300"
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
          <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Welcome to InsightLens</h1>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
            Your survey analysis tool — let's get started
          </p>
        </div>

        <Card className="p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-700 dark:text-primary-200" />
            </div>
            <h2 className="text-xl font-semibold font-serif text-primary-800 dark:text-primary-100 mb-2">Import your first survey</h2>
            <p className="text-primary-600 dark:text-primary-300 mb-6">
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
              <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-700 dark:text-primary-200" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 dark:text-primary-100 text-sm">Track trends</h3>
                <p className="text-xs text-primary-600 dark:text-primary-300 mt-1">See how satisfaction scores change over semesters</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-success-50 dark:bg-success-900/40 rounded-lg flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-success-500 dark:text-success-300" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 dark:text-primary-100 text-sm">Analyse comments</h3>
                <p className="text-xs text-primary-600 dark:text-primary-300 mt-1">Understand student sentiment and common themes</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-warning-50 dark:bg-warning-900/40 rounded-lg flex-shrink-0">
                <Bot className="w-5 h-5 text-warning-500 dark:text-warning-300" />
              </div>
              <div>
                <h3 className="font-medium text-primary-800 dark:text-primary-100 text-sm">Ask questions</h3>
                <p className="text-xs text-primary-600 dark:text-primary-300 mt-1">Chat with your data using natural language</p>
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
        <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Dashboard</h1>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
          Overview of your unit survey data and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-9 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </Card>
          ))
        ) : (
          <>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-300">Total Units</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800 dark:text-primary-100">
                {stats?.total_units || 0}
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-800 rounded-lg">
              <Users className="w-6 h-6 text-primary-700 dark:text-primary-200" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-300">Total Surveys</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800 dark:text-primary-100">
                {stats?.total_surveys || 0}
              </p>
            </div>
            <div className="p-3 bg-success-50 dark:bg-success-900/40 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success-500 dark:text-success-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-300">Avg Response Rate</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800 dark:text-primary-100">
                {stats?.avg_response_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-800 rounded-lg">
              <Users className="w-6 h-6 text-primary-700 dark:text-primary-200" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-300">Total Comments</p>
              <p className="mt-2 text-3xl font-semibold font-serif text-primary-800 dark:text-primary-100">
                {stats?.total_comments || 0}
              </p>
            </div>
            <div className="p-3 bg-warning-50 dark:bg-warning-900/40 rounded-lg">
              <MessageSquare className="w-6 h-6 text-warning-500 dark:text-warning-300" />
            </div>
          </div>
        </Card>
          </>
        )}
      </div>

      {/* Pinned AI charts */}
      {pinnedCharts && pinnedCharts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Pin className="w-5 h-5 text-primary-300" />
            <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">
              Pinned Charts
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pinnedCharts.map((pin) => (
              <PinnedChartCard key={pin.id} pin={pin} />
            ))}
          </div>
        </div>
      )}

      {/* Charts and AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif mb-4">
            Overall Experience Trend
          </h2>
          {trendLoading ? (
            <div className="h-64 space-y-3">
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
          ) : trendData && trendData.length > 0 ? (
            <LineChart
              // Build a combined "<semester> <year>" period label so consecutive
              // years don't collapse into a confusing "Sem 1, Sem 2, Sem 1, …"
              // sawtooth on the x-axis. The query already orders rows
              // chronologically, so the label order is correct as-is.
              data={trendData.map((d: any) => ({ ...d, period_label: `${d.semester} ${d.year}` }))}
              xKey="period_label"
              yKey="avg_experience"
              xLabel="Period"
              yLabel="Average Experience (%)"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-primary-600 dark:text-primary-300">
              No trend data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">
              Recent Surveys
            </h2>
            <Link
              to="/units"
              className="text-sm text-success-500 dark:text-success-300 hover:text-success-700 dark:hover:text-success-300"
            >
              View All Units
            </Link>
          </div>
          <div className="space-y-3">
            {recentSurveysLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                    <div className="flex flex-col items-end">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="mt-2 h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            {recentSurveys?.slice(0, 5).map((survey: any, index: number) => (
              <Link
                key={index}
                to={`/unit/${survey.unit_code}`}
                className="block p-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-800 dark:text-primary-100">{survey.unit_code}</p>
                    <p className="text-sm text-primary-600 dark:text-primary-300">
                      {survey.semester} {survey.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-800 dark:text-primary-100">
                      {survey.overall_experience?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-300">
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
              <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">
                Top Performers
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {topPerformers && topPerformers.length > 0 && (
                <div className="flex items-center gap-2">
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
              <span className="text-xs text-primary-600 dark:text-primary-300">
                Last 12 months
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-primary-600 dark:text-primary-300">
              Units with exceptional student satisfaction (≥85%)
            </p>
            <div className="flex items-center gap-2">
              {topPerformers && topPerformers.length > 0 && (
                <p className="text-xs text-primary-600 dark:text-primary-300 font-medium">
                  {topPerformers.length} total units
                </p>
              )}
              <Link
                to="/reports?type=star-performers"
                className="text-xs text-success-500 dark:text-success-300 hover:text-success-700 dark:hover:text-success-300 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {(latestInfoLoading || topPerformersLoading) ? (
              <div className="border-l-4 border-primary-200 dark:border-primary-700 pl-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-primary-200 dark:border-primary-700">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                  ))}
                </div>
              </div>
            ) : Object.keys(groupedTopPerformers).length > 0 ? (
              Object.entries(groupedTopPerformers).map(([period, units]) => (
                <div key={period} className="border-l-4 border-primary-300 dark:border-primary-600 pl-4">
                  <h4 className="text-sm font-medium text-primary-800 dark:text-primary-100 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors border border-primary-200 dark:border-primary-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-primary-300" />
                              <span className="font-medium text-primary-800 dark:text-primary-100">{unit.unit_code}</span>
                              <span className="text-success-500 dark:text-success-300 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-primary-600 dark:text-primary-300 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-primary-600 dark:text-primary-300">
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
              <AlertCircle className="w-5 h-5 text-warning-500 dark:text-warning-300" />
              <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">
                Units Needing Attention
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {unitsNeedingAttention && unitsNeedingAttention.length > 0 && (
                <div className="flex items-center gap-2">
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
              <span className="text-xs text-primary-600 dark:text-primary-300">
                Last 12 months
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-primary-600 dark:text-primary-300">
              Units with lower satisfaction scores (&lt;70%) requiring support
            </p>
            <div className="flex items-center gap-2">
              {unitsNeedingAttention && unitsNeedingAttention.length > 0 && (
                <p className="text-xs text-primary-600 dark:text-primary-300 font-medium">
                  {unitsNeedingAttention.length} total units
                </p>
              )}
              <Link
                to="/reports?type=needs-attention"
                className="text-xs text-success-500 dark:text-success-300 hover:text-success-700 dark:hover:text-success-300 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {(latestInfoLoading || attentionLoading) ? (
              <div className="border-l-4 border-primary-200 dark:border-primary-700 pl-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-primary-200 dark:border-primary-700">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                  ))}
                </div>
              </div>
            ) : Object.keys(groupedUnitsAttention).length > 0 ? (
              Object.entries(groupedUnitsAttention).map(([period, units]) => (
                <div key={period} className="border-l-4 border-warning-500 pl-4">
                  <h4 className="text-sm font-medium text-primary-800 dark:text-primary-100 mb-2">{period}</h4>
                  <div className="space-y-2">
                    {units.slice(0, 3).map((unit: any) => (
                      <Link
                        key={`${unit.unit_code}-${unit.year}-${unit.semester}`}
                        to={`/unit/${unit.unit_code}`}
                        className="block p-3 rounded-lg hover:bg-warning-50 dark:hover:bg-warning-900/40 transition-colors border border-warning-50 dark:border-warning-900"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary-800 dark:text-primary-100">{unit.unit_code}</span>
                              <span className="text-warning-500 dark:text-warning-300 font-medium">
                                {unit.overall_experience.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">{unit.discipline_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {units.length > 3 && (
                      <p className="text-xs text-primary-600 dark:text-primary-300 ml-6">
                        +{units.length - 3} more units
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-primary-600 dark:text-primary-300">
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