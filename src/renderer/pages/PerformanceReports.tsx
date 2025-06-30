import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Star, 
  AlertCircle, 
  Download, 
  FileText, 
  Filter, 
  Calendar,
  MapPin,
  BookOpen,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { 
  exportStarPerformersCSV, 
  exportStarPerformersMarkdown,
  exportUnitsNeedingAttentionCSV,
  exportUnitsNeedingAttentionMarkdown,
  generatePerformanceCSV,
  generatePerformanceMarkdown,
  downloadFile,
  generateFilename,
  type PerformanceUnit 
} from '../utils/performanceExports';

interface FilterState {
  year: string;
  semester: string;
  campus: string;
  discipline: string;
  satisfactionThreshold: number;
  reportType: 'star-performers' | 'needs-attention' | 'complete-summary';
}

export function PerformanceReports() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    year: '',
    semester: '',
    campus: '',
    discipline: '',
    satisfactionThreshold: 85,
    reportType: 'star-performers'
  });

  // Set initial report type based on URL parameter
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'star-performers' || type === 'needs-attention') {
      setFilters(prev => ({ ...prev, reportType: type }));
    }
  }, [searchParams]);

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['performance-filter-options'],
    queryFn: async () => {
      const years = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.year 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        ORDER BY uo.year DESC
      `);
      
      const semesters = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.semester 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        ORDER BY uo.semester
      `);
      
      const campuses = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.location as campus 
        FROM unit_offering uo 
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        ORDER BY uo.location
      `);
      
      const disciplines = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT d.discipline_name 
        FROM discipline d 
        JOIN unit u ON d.discipline_code = u.discipline_code
        JOIN unit_offering uo ON u.unit_code = uo.unit_code
        JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        ORDER BY d.discipline_name
      `);

      return {
        years: years.map((y: any) => y.year),
        semesters: semesters.map((s: any) => s.semester),
        campuses: campuses.map((c: any) => c.campus),
        disciplines: disciplines.map((d: any) => d.discipline_name)
      };
    }
  });

  // Build dynamic query based on filters
  const buildQuery = () => {
    let whereConditions = [];
    
    if (filters.year) {
      whereConditions.push(`uo.year = ${filters.year}`);
    }
    
    if (filters.semester) {
      whereConditions.push(`uo.semester = '${filters.semester}'`);
    }
    
    if (filters.campus) {
      whereConditions.push(`uo.location = '${filters.campus}'`);
    }
    
    if (filters.discipline) {
      whereConditions.push(`d.discipline_name = '${filters.discipline}'`);
    }

    // Add satisfaction criteria based on report type
    if (filters.reportType === 'star-performers') {
      whereConditions.push(`us.overall_experience >= ${filters.satisfactionThreshold}`);
    } else if (filters.reportType === 'needs-attention') {
      whereConditions.push(`us.overall_experience < 70`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    return `
      SELECT 
        u.unit_code,
        u.unit_name,
        uo.year,
        uo.semester,
        uo.location as campus,
        us.overall_experience,
        us.response_rate,
        us.responses,
        us.enrolments,
        d.discipline_name
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      JOIN unit u ON uo.unit_code = u.unit_code
      JOIN discipline d ON u.discipline_code = d.discipline_code
      ${whereClause}
      ORDER BY us.overall_experience DESC, uo.year DESC, uo.semester DESC
    `;
  };

  // Fetch performance data based on filters
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['performance-data', filters],
    queryFn: async () => {
      const query = buildQuery();
      return window.electronAPI.queryDatabase(query);
    }
  });

  // Transform data for export utilities
  const transformedData: PerformanceUnit[] = useMemo(() => {
    if (!performanceData) return [];
    
    return performanceData.map((unit: any) => ({
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      year: unit.year,
      semester: unit.semester,
      overall_experience: unit.overall_experience,
      response_rate: unit.response_rate,
      discipline_name: unit.discipline_name,
      responses: unit.responses,
      enrolments: unit.enrolments
    }));
  }, [performanceData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!performanceData || performanceData.length === 0) return null;

    const total = performanceData.length;
    const avgSatisfaction = performanceData.reduce((sum: number, unit: any) => sum + unit.overall_experience, 0) / total;
    const avgResponseRate = performanceData.reduce((sum: number, unit: any) => sum + unit.response_rate, 0) / total;
    const topScore = Math.max(...performanceData.map((unit: any) => unit.overall_experience));
    const lowestScore = Math.min(...performanceData.map((unit: any) => unit.overall_experience));

    return {
      total,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      avgResponseRate: avgResponseRate.toFixed(1),
      topScore: topScore.toFixed(1),
      lowestScore: lowestScore.toFixed(1)
    };
  }, [performanceData]);

  // Export handlers
  const handleExport = (format: 'csv' | 'markdown') => {
    if (!transformedData || transformedData.length === 0) return;

    const getTitle = () => {
      switch (filters.reportType) {
        case 'star-performers':
          return `Star Performers Report (≥${filters.satisfactionThreshold}% Satisfaction)`;
        case 'needs-attention':
          return 'Units Needing Support Report (<70% Satisfaction)';
        case 'complete-summary':
          return 'Complete Performance Summary Report';
        default:
          return 'Performance Report';
      }
    };

    const options = {
      title: getTitle(),
      subtitle: generateSubtitle()
    };

    if (format === 'csv') {
      const csv = generatePerformanceCSV(transformedData, options);
      const filename = generateFilename(
        filters.reportType.replace('-', '_'), 
        'csv'
      );
      downloadFile(csv, filename, 'text/csv');
    } else {
      const markdown = generatePerformanceMarkdown(transformedData, options);
      const filename = generateFilename(
        filters.reportType.replace('-', '_') + '_report', 
        'md'
      );
      downloadFile(markdown, filename, 'text/markdown');
    }
  };

  const generateSubtitle = () => {
    const parts = [];
    if (filters.year) parts.push(`Year: ${filters.year}`);
    if (filters.semester) parts.push(`Semester: ${filters.semester}`);
    if (filters.campus) parts.push(`Campus: ${filters.campus}`);
    if (filters.discipline) parts.push(`Discipline: ${filters.discipline}`);
    return parts.length > 0 ? parts.join(' | ') : 'All units';
  };

  const resetFilters = () => {
    setFilters({
      year: '',
      semester: '',
      campus: '',
      discipline: '',
      satisfactionThreshold: 85,
      reportType: 'star-performers'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate comprehensive reports for star performers and units needing support
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Report Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="star-performers">⭐ Star Performers</option>
              <option value="needs-attention">⚠️ Needs Attention</option>
              <option value="complete-summary">📊 Complete Summary</option>
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Years</option>
              {filterOptions?.years.map((year: number) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Semesters</option>
              {filterOptions?.semesters.map((semester: string) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Campus
            </label>
            <select
              value={filters.campus}
              onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Campuses</option>
              {filterOptions?.campuses.map((campus: string) => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Discipline Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Discipline
            </label>
            <select
              value={filters.discipline}
              onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Disciplines</option>
              {filterOptions?.disciplines.map((discipline: string) => (
                <option key={discipline} value={discipline}>{discipline}</option>
              ))}
            </select>
          </div>

          {/* Satisfaction Threshold (for star performers) */}
          {filters.reportType === 'star-performers' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Minimum Satisfaction (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.satisfactionThreshold}
                onChange={(e) => setFilters({ ...filters, satisfactionThreshold: parseInt(e.target.value) || 85 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={resetFilters} variant="secondary" size="sm">
            Clear Filters
          </Button>
          <span className="text-sm text-gray-500">
            {generateSubtitle() || 'No filters applied'}
          </span>
        </div>
      </Card>

      {/* Results Summary */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Units</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryStats.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Satisfaction</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryStats.avgSatisfaction}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Response Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryStats.avgResponseRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Highest Score</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryStats.topScore}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Lowest Score</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryStats.lowestScore}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Export Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Export Report</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExport('csv')}
              disabled={!transformedData || transformedData.length === 0 || isLoading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('markdown')}
              disabled={!transformedData || transformedData.length === 0 || isLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading performance data...
          </div>
        ) : transformedData && transformedData.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found {transformedData.length} units matching your criteria. 
              Export as CSV for spreadsheet analysis or as a formatted report for presentations.
            </p>
            
            {/* Preview of first few results */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-900">Preview (showing first 5 results)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Satisfaction</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Response Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transformedData.slice(0, 5).map((unit, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium text-gray-900">{unit.unit_code}</p>
                            <p className="text-sm text-gray-500">{unit.discipline_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {unit.semester} {unit.year}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`font-medium ${
                            unit.overall_experience >= 85 ? 'text-green-600' :
                            unit.overall_experience < 70 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {unit.overall_experience.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {unit.response_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {transformedData.length > 5 && (
                <div className="bg-gray-50 px-4 py-2 border-t">
                  <p className="text-xs text-gray-500">
                    ... and {transformedData.length - 5} more units
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No units found matching your criteria. Try adjusting your filters.
          </div>
        )}
      </Card>
    </div>
  );
}