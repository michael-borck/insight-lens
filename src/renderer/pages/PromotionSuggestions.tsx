import React, { useState, useEffect } from 'react';
import { Award, Download, Filter, TrendingUp, Search, ChevronRight, Star, BarChart, FileText, Users } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';

interface UnitPromotionData {
  unitCode: string;
  unitName: string;
  averageSatisfaction: number;
  averageResponseRate: number;
  trend: number;
  suggestedLevel: string;
  benchmarkComparison: {
    exceedsFaculty: boolean;
    exceedsUniversity: boolean;
    facultyDifference: number;
    universityDifference: number;
  };
  evidence: any[];
  positiveComments: any[];
}

interface PromotionFilters {
  minSatisfaction: number;
  startYear?: number;
  endYear?: number;
  includeComments: boolean;
  includeBenchmarks: boolean;
  includeTrends: boolean;
}

export function PromotionSuggestions() {
  const [units, setUnits] = useState<UnitPromotionData[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitPromotionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [summaryReport, setSummaryReport] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'summary'>('individual');
  const [filters, setFilters] = useState<PromotionFilters>({
    minSatisfaction: 80,
    includeComments: true,
    includeBenchmarks: true,
    includeTrends: true
  });
  const [highPerformers, setHighPerformers] = useState<any[]>([]);

  // Load high performing units on mount
  useEffect(() => {
    loadHighPerformers();
  }, []);

  const loadHighPerformers = async () => {
    try {
      const result = await window.electronAPI.getHighPerformingUnits(filters.minSatisfaction);
      if (result.success) {
        setHighPerformers(result.data);
      }
    } catch (error) {
      logger.error('Failed to load high performers:', error);
    }
  };

  const analyzeUnits = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.analyzeUnitsForPromotion(filters);
      
      if (result.success) {
        setUnits(result.data);
        if (result.data.length === 0) {
          toast.info('No units found matching the criteria');
        } else {
          toast.success(`Found ${result.data.length} units for promotion analysis`);
        }
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    } catch (error) {
      logger.error('Analysis error:', error);
      toast.error('Failed to analyze units');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (unit: UnitPromotionData) => {
    setGenerating(true);
    setSelectedUnit(unit);
    
    try {
      const result = await window.electronAPI.generatePromotionReport(unit);
      
      if (result.success) {
        setReport(result.data);
        toast.success('Report generated successfully');
      } else {
        toast.error(result.error || 'Report generation failed');
      }
    } catch (error) {
      logger.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateSummaryReport = async () => {
    if (units.length === 0) {
      toast.warning('Please analyze units first');
      return;
    }
    
    setGenerating(true);
    try {
      const result = await window.electronAPI.generatePromotionSummary(units);
      
      if (result.success) {
        setSummaryReport(result.data);
        setViewMode('summary');
        toast.success('Summary report generated successfully');
      } else {
        toast.error(result.error || 'Summary generation failed');
      }
    } catch (error) {
      logger.error('Summary generation error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'html' | 'text', isSummary: boolean = false) => {
    if (isSummary) {
      if (!summaryReport) return;
      
      try {
        const content = format === 'html' ? summaryReport.html : summaryReport.text;
        const filename = `promotion-summary-${new Date().toISOString().split('T')[0]}`;
        
        const result = await window.electronAPI.exportPromotionReport(format, content, filename);
        
        if (result.success) {
          toast.success(`Summary exported to ${result.path}`);
        } else {
          toast.error(result.error || 'Export failed');
        }
      } catch (error) {
        logger.error('Export error:', error);
        toast.error('Failed to export summary');
      }
    } else {
      if (!report || !selectedUnit) return;
      
      try {
        const content = format === 'html' ? report.html : report.text;
        const filename = `promotion-evidence-${selectedUnit.unitCode}-${new Date().toISOString().split('T')[0]}`;
        
        const result = await window.electronAPI.exportPromotionReport(format, content, filename);
        
        if (result.success) {
          toast.success(`Report exported to ${result.path}`);
        } else {
          toast.error(result.error || 'Export failed');
        }
      } catch (error) {
        logger.error('Export error:', error);
        toast.error('Failed to export report');
      }
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'E': return 'bg-purple-500';
      case 'D': return 'bg-blue-500';
      case 'C': return 'bg-green-500';
      case 'B': return 'bg-yellow-500';
      case 'A': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'developing': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Award className="w-8 h-8 text-primary-600" />
          Promotion Suggestions
        </h1>
        <p className="mt-2 text-gray-600">
          Analyze survey data to generate evidence for academic promotion applications aligned with ACF 2025
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Analysis Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Satisfaction
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minSatisfaction}
              onChange={(e) => setFilters({ ...filters, minSatisfaction: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Year
            </label>
            <input
              type="number"
              min="2000"
              max="2030"
              value={filters.startYear || ''}
              onChange={(e) => setFilters({ ...filters, startYear: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Year
            </label>
            <input
              type="number"
              min="2000"
              max="2030"
              value={filters.endYear || ''}
              onChange={(e) => setFilters({ ...filters, endYear: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeComments}
              onChange={(e) => setFilters({ ...filters, includeComments: e.target.checked })}
              className="mr-2"
            />
            Include Comments
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeBenchmarks}
              onChange={(e) => setFilters({ ...filters, includeBenchmarks: e.target.checked })}
              className="mr-2"
            />
            Include Benchmarks
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeTrends}
              onChange={(e) => setFilters({ ...filters, includeTrends: e.target.checked })}
              className="mr-2"
            />
            Include Trends
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={analyzeUnits}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Analyze Units'}
          </Button>
        </div>
      </Card>

      {/* Quick Select High Performers */}
      {highPerformers.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            High Performing Units (Quick Select)
          </h3>
          <div className="flex flex-wrap gap-2">
            {highPerformers.slice(0, 10).map(unit => (
              <button
                key={unit.unitCode}
                onClick={() => {
                  setFilters({ ...filters, minSatisfaction: 75 });
                  analyzeUnits();
                }}
                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100 transition-colors"
              >
                {unit.unitCode} ({unit.satisfaction}%)
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* View Mode Toggle and Summary Button */}
      {units.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'individual' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('individual')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Individual Reports
            </Button>
            <Button
              variant={viewMode === 'summary' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Overall Summary
            </Button>
          </div>
          
          {viewMode === 'summary' && !summaryReport && (
            <Button
              onClick={generateSummaryReport}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <BarChart className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate Summary'}
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {units.length > 0 && viewMode === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Units List */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Analysis Results ({units.length} units)
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {units.map(unit => (
                <div
                  key={unit.unitCode}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedUnit?.unitCode === unit.unitCode
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => generateReport(unit)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{unit.unitCode}</h3>
                        <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getLevelBadgeColor(unit.suggestedLevel)}`}>
                          Level {unit.suggestedLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{unit.unitName}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Satisfaction:</span>
                      <span className="ml-1 font-medium">{unit.averageSatisfaction}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Response:</span>
                      <span className="ml-1 font-medium">{unit.averageResponseRate}%</span>
                    </div>
                    {unit.trend !== 0 && (
                      <div className="col-span-2 flex items-center gap-1">
                        <TrendingUp className={`w-3 h-3 ${unit.trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={unit.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                          {unit.trend > 0 ? '+' : ''}{unit.trend}% trend
                        </span>
                      </div>
                    )}
                  </div>

                  {(unit.benchmarkComparison.exceedsFaculty || unit.benchmarkComparison.exceedsUniversity) && (
                    <div className="mt-2 text-xs">
                      {unit.benchmarkComparison.exceedsUniversity && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded">
                          Exceeds University +{unit.benchmarkComparison.universityDifference}%
                        </span>
                      )}
                      {unit.benchmarkComparison.exceedsFaculty && !unit.benchmarkComparison.exceedsUniversity && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Exceeds Faculty +{unit.benchmarkComparison.facultyDifference}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Report Preview */}
          {report && selectedUnit && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Promotion Evidence Report</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => exportReport('text')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Text
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => exportReport('html')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    HTML
                  </Button>
                </div>
              </div>

              {generating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Generating report...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Executive Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Executive Summary</h3>
                    <p className="text-sm text-blue-800">{report.report.executiveSummary}</p>
                  </div>

                  {/* Metrics */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <BarChart className="w-4 h-4" />
                      Key Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Satisfaction:</span>
                        <span className="ml-1 font-medium">{report.report.quantitativeMetrics.averageSatisfaction}%</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Response Rate:</span>
                        <span className="ml-1 font-medium">{report.report.quantitativeMetrics.averageResponseRate}%</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded col-span-2">
                        <span className="text-gray-600">Trend:</span>
                        <span className="ml-1 font-medium">{report.report.quantitativeMetrics.trend}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded col-span-2">
                        <span className="text-gray-600">Benchmark:</span>
                        <span className="ml-1 font-medium">{report.report.quantitativeMetrics.benchmarkPerformance}</span>
                      </div>
                    </div>
                  </div>

                  {/* Teaching Evidence */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{report.report.teachingEvidence.title}</h3>
                    <div className="space-y-2">
                      {report.report.teachingEvidence.evidence.slice(0, 3).map((ev: any, idx: number) => (
                        <div key={idx} className="text-sm border-l-4 border-primary-500 pl-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ev.criterion}</span>
                            <span className={`text-xs ${getStrengthColor(ev.strength)}`}>
                              [{ev.strength}]
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">{ev.statement}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {report.report.recommendations.slice(0, 4).map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-primary-600 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Summary View */}
      {units.length > 0 && viewMode === 'summary' && summaryReport && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Overall Promotion Summary</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportReport('text', true)}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Text
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportReport('html', true)}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                HTML
              </Button>
            </div>
          </div>

          {/* Overall Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {summaryReport.summary.totalUnits}
              </div>
              <div className="text-sm text-gray-600">Total Units</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">
                {summaryReport.summary.overallMetrics.averageSatisfaction}%
              </div>
              <div className="text-sm text-blue-700">Avg Satisfaction</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-900">
                {summaryReport.summary.overallMetrics.unitsExceedingBenchmarks}
              </div>
              <div className="text-sm text-green-700">Exceed Benchmarks</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">
                {summaryReport.summary.overallMetrics.unitsWithPositiveTrend}
              </div>
              <div className="text-sm text-purple-700">Positive Trend</div>
            </div>
          </div>

          {/* Level Distribution */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">ACF Level Distribution</h3>
            <div className="flex gap-2">
              {Object.entries(summaryReport.summary.levelDistribution).map(([level, count]) => (
                <div
                  key={level}
                  className={`flex-1 text-center py-3 rounded-lg text-white font-medium ${getLevelBadgeColor(level)}`}
                >
                  <div className="text-xl font-bold">{count as number}</div>
                  <div className="text-sm">Level {level}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          {summaryReport.summary.topPerformers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Top Performers</h3>
              <div className="space-y-2">
                {summaryReport.summary.topPerformers.map((unit: any) => (
                  <div key={unit.unitCode} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <span className="font-medium">{unit.unitCode}</span>
                        <span className="text-gray-600 ml-2">{unit.unitName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getLevelBadgeColor(unit.level)}`}>
                        Level {unit.level}
                      </span>
                      <span className="text-sm font-medium">{unit.satisfaction}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rising Stars */}
          {summaryReport.summary.risingStars.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Rising Stars</h3>
              <div className="space-y-2">
                {summaryReport.summary.risingStars.map((unit: any) => (
                  <div key={unit.unitCode} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <div>
                        <span className="font-medium">{unit.unitCode}</span>
                        <span className="text-gray-600 ml-2">{unit.unitName}</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {unit.keyStrength}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Strengths */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Key Strengths</h3>
            <div className="space-y-2">
              {summaryReport.summary.keyStrengths.map((strength: string, idx: number) => (
                <div key={idx} className="p-3 bg-green-50 rounded-lg text-green-800">
                  • {strength}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
            <div className="space-y-2">
              {summaryReport.summary.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="p-3 bg-yellow-50 rounded-lg text-yellow-900">
                  • {rec}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {units.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Analysis Results Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Set your filters and click "Analyze Units" to identify units with strong promotion evidence
          </p>
          <Button onClick={analyzeUnits}>
            Start Analysis
          </Button>
        </Card>
      )}
    </div>
  );
}