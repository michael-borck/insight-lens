import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown, Users, Calendar, Grid3X3, LayoutGrid, Table2, BarChart3 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface FilterState {
  search: string;
  campus: string;
  year: string;
  semester: string;
  discipline: string;
}

type DataLevel = 'aggregate' | 'individual';

interface DataContext {
  totalUnits: number;
  uniqueDisciplines: number;
  uniqueCampuses: number;
  uniqueYears: number;
  hasMultipleOfferings: boolean;
  hasHistoricalData: boolean;
  performanceVariance: number;
}

type ViewMode = 'cards' | 'table' | 'comparison';

export function Units() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    campus: '',
    year: '',
    semester: '',
    discipline: ''
  });
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [dataLevel, setDataLevel] = useState<DataLevel>('aggregate');

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const campuses = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.location as campus 
        FROM unit_offering uo 
        ORDER BY uo.location
      `);
      
      const years = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.year 
        FROM unit_offering uo 
        ORDER BY uo.year DESC
      `);
      
      const semesters = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT uo.semester 
        FROM unit_offering uo 
        ORDER BY uo.semester
      `);
      
      const disciplines = await window.electronAPI.queryDatabase(`
        SELECT DISTINCT d.discipline_name, d.discipline_code 
        FROM discipline d 
        JOIN unit u ON d.discipline_code = u.discipline_code
        ORDER BY d.discipline_name
      `);

      return { campuses, years, semesters, disciplines };
    }
  });

  // Fetch data context for adaptive decisions
  const { data: dataContext } = useQuery({
    queryKey: ['units-context'],
    queryFn: async () => {
      const contextData = await window.electronAPI.queryDatabase(`
        SELECT 
          COUNT(DISTINCT u.unit_code) as total_units,
          COUNT(DISTINCT d.discipline_code) as unique_disciplines,
          COUNT(DISTINCT uo.location) as unique_campuses,
          COUNT(DISTINCT uo.year) as unique_years,
          COUNT(DISTINCT us.survey_id) as total_surveys,
          AVG(us.overall_experience) as avg_performance,
          MIN(us.overall_experience) as min_performance,
          MAX(us.overall_experience) as max_performance
        FROM unit u
        LEFT JOIN discipline d ON u.discipline_code = d.discipline_code
        LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
        LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
      `);
      
      const result = contextData[0];
      return {
        totalUnits: result.total_units,
        uniqueDisciplines: result.unique_disciplines,
        uniqueCampuses: result.unique_campuses,
        uniqueYears: result.unique_years,
        hasMultipleOfferings: result.total_surveys > result.total_units,
        hasHistoricalData: result.unique_years > 1,
        performanceVariance: result.max_performance - result.min_performance
      } as DataContext;
    }
  });

  // Fetch filtered units (aggregate or individual based on dataLevel)
  const { data: units, isLoading } = useQuery({
    queryKey: ['units', filters, dataLevel],
    queryFn: async () => {
      const params: any[] = [];
      let sql: string;

      if (dataLevel === 'aggregate') {
        // Aggregate view - one row per unit
        sql = `
          SELECT 
            u.unit_code,
            u.unit_name,
            d.discipline_name,
            COUNT(DISTINCT us.survey_id) as survey_count,
            AVG(us.overall_experience) as avg_experience,
            AVG(us.response_rate) as avg_response_rate,
            MAX(uo.year || '-' || uo.semester) as latest_period,
            COUNT(DISTINCT uo.location) as campus_count,
            GROUP_CONCAT(DISTINCT uo.location) as campuses,
            COUNT(DISTINCT uo.mode) as mode_count,
            GROUP_CONCAT(DISTINCT uo.mode) as modes,
            MIN(uo.year) as first_year,
            MAX(uo.year) as last_year
          FROM unit u
          LEFT JOIN discipline d ON u.discipline_code = d.discipline_code
          LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
          LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
          WHERE 1=1
        `;
      } else {
        // Individual view - one row per survey event
        sql = `
          SELECT 
            u.unit_code,
            u.unit_name,
            d.discipline_name,
            us.survey_id,
            us.overall_experience as avg_experience,
            us.response_rate as avg_response_rate,
            uo.year || '-' || uo.semester as latest_period,
            uo.location as campuses,
            uo.mode as modes,
            uo.year,
            uo.semester,
            us.responses,
            us.enrolments,
            1 as survey_count
          FROM unit u
          LEFT JOIN discipline d ON u.discipline_code = d.discipline_code
          LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
          LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
          WHERE us.survey_id IS NOT NULL
        `;
      }
      
      if (filters.search) {
        sql += ` AND (u.unit_code LIKE ? OR u.unit_name LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (filters.campus) {
        sql += ` AND uo.location = ?`;
        params.push(filters.campus);
      }
      
      if (filters.year) {
        sql += ` AND uo.year = ?`;
        params.push(parseInt(filters.year));
      }
      
      if (filters.semester) {
        sql += ` AND uo.semester = ?`;
        params.push(filters.semester);
      }
      
      if (filters.discipline) {
        sql += ` AND d.discipline_code = ?`;
        params.push(filters.discipline);
      }
      
      if (dataLevel === 'aggregate') {
        sql += `
          GROUP BY u.unit_code, u.unit_name, d.discipline_name
          ORDER BY u.unit_code
        `;
      } else {
        sql += `
          ORDER BY u.unit_code, uo.year DESC, uo.semester DESC
        `;
      }
      
      return window.electronAPI.queryDatabase(sql, params);
    }
  });

  // Adaptive logic based on data context
  const adaptiveConfig = useMemo(() => {
    if (!dataContext || !units) return null;
    
    const recommendedView = dataContext.totalUnits > 20 ? 'table' : 'cards';
    const showDisciplineFilter = dataContext.uniqueDisciplines > 1;
    const showCampusFilter = dataContext.uniqueCampuses > 1;
    const showYearFilter = dataContext.hasHistoricalData;
    const showPerformanceTiers = dataContext.performanceVariance > 20;
    
    return {
      recommendedView,
      showDisciplineFilter,
      showCampusFilter, 
      showYearFilter,
      showPerformanceTiers,
      enableComparison: units.length > 1,
      enableGrouping: dataContext.totalUnits > 10
    };
  }, [dataContext, units]);

  // Auto-adjust view mode based on data context
  React.useEffect(() => {
    if (adaptiveConfig?.recommendedView && viewMode === 'cards' && adaptiveConfig.recommendedView === 'table') {
      setViewMode('table');
    }
  }, [adaptiveConfig?.recommendedView, viewMode]);

  const clearFilters = () => {
    setFilters({
      search: '',
      campus: '',
      year: '',
      semester: '',
      discipline: ''
    });
  };

  const toggleUnitSelection = (unitCode: string) => {
    setSelectedUnits(prev => 
      prev.includes(unitCode) 
        ? prev.filter(code => code !== unitCode)
        : [...prev, unitCode]
    );
  };

  const getPerformanceTier = (avgExperience: number) => {
    if (avgExperience >= 80) return 'high';
    if (avgExperience >= 65) return 'medium';
    return 'low';
  };

  const getContextualInsights = (unit: any) => {
    const insights = [];
    if (unit.avg_experience >= 85) insights.push('High Performing');
    if (unit.avg_experience < 65) insights.push('Needs Attention');
    if (unit.survey_count > 5) insights.push('Well Documented');
    if (unit.avg_response_rate > 80) insights.push('High Engagement');
    return insights;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="mt-1 text-sm text-gray-500">
            {dataContext ? (
              dataLevel === 'aggregate'
                ? `${dataContext.totalUnits} units across ${dataContext.uniqueDisciplines} discipline${dataContext.uniqueDisciplines !== 1 ? 's' : ''}`
                : `${units?.length || 0} survey events from ${dataContext.totalUnits} units`
            ) : (
              'Browse and filter all units in your database'
            )}
          </p>
          
          {/* Data Level Toggle */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <div className="flex rounded-md border border-gray-300 bg-white">
              <button
                onClick={() => setDataLevel('aggregate')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  dataLevel === 'aggregate'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Unit Summary
              </button>
              <button
                onClick={() => setDataLevel('individual')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  dataLevel === 'individual'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Survey Events
              </button>
            </div>
          </div>
        </div>
        
        {adaptiveConfig?.enableComparison && (
          <div className="flex items-center gap-2">
            {selectedUnits.length > 0 && (
              <div className="text-sm text-gray-600 mr-4">
                {selectedUnits.length} selected
              </div>
            )}
            
            <div className="flex rounded-md border border-gray-300">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'cards'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Table2 className="w-4 h-4" />
              </button>
              {selectedUnits.length > 1 && (
                <button
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'comparison'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Unit code or name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Campus - Only show if multiple campuses exist */}
          {adaptiveConfig?.showCampusFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campus
              </label>
              <select
                value={filters.campus}
                onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All Campuses</option>
                {filterOptions?.campuses.map((campus: any) => (
                  <option key={campus.campus} value={campus.campus}>
                    {campus.campus}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year - Only show if historical data exists */}
          {adaptiveConfig?.showYearFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All Years</option>
                {filterOptions?.years.map((year: any) => (
                  <option key={year.year} value={year.year}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester - Always show as it's a common filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Semesters</option>
              {filterOptions?.semesters.map((semester: any) => (
                <option key={semester.semester} value={semester.semester}>
                  {semester.semester}
                </option>
              ))}
            </select>
          </div>

          {/* Discipline - Only show if multiple disciplines exist */}
          {adaptiveConfig?.showDisciplineFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discipline
              </label>
              <select
                value={filters.discipline}
                onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All Disciplines</option>
                {filterOptions?.disciplines.map((discipline: any) => (
                  <option key={discipline.discipline_code} value={discipline.discipline_code}>
                    {discipline.discipline_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            {units?.length || 0} units found
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Units Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading units...</p>
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {adaptiveConfig?.enableComparison && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={selectedUnits.length === units?.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUnits(units?.map((u: any) => u.unit_code) || []);
                          } else {
                            setSelectedUnits([]);
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discipline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {dataLevel === 'aggregate' ? 'Latest Period' : 'Period'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {dataLevel === 'aggregate' ? 'Surveys' : 'Responses'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Rate
                  </th>
                  {getContextualInsights(units?.[0] || {}).length > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insights
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {units?.map((unit: any) => (
                  <tr key={unit.unit_code} className="hover:bg-gray-50">
                    {adaptiveConfig?.enableComparison && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={selectedUnits.includes(unit.unit_code)}
                          onChange={() => toggleUnitSelection(unit.unit_code)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={dataLevel === 'aggregate' ? `/unit/${unit.unit_code}` : `/unit/${unit.unit_code}#survey-${unit.survey_id}`}
                        className="text-primary-600 hover:text-primary-900 font-medium"
                      >
                        {unit.unit_code}
                        {dataLevel === 'individual' && unit.survey_id && (
                          <span className="text-xs text-gray-500 ml-2">#{unit.survey_id}</span>
                        )}
                      </Link>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {unit.unit_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.discipline_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unit.latest_period}
                      <div className="text-xs text-gray-400">
                        {dataLevel === 'aggregate' ? (
                          <>
                            {unit.campus_count > 1 ? `${unit.campus_count} campuses` : unit.campuses || 'No data'}
                            {unit.modes && ` • ${unit.mode_count > 1 ? `${unit.mode_count} modes` : unit.modes}`}
                          </>
                        ) : (
                          <>
                            {unit.campuses} • {unit.modes}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {unit.avg_experience ? (
                        <div className={`flex items-center gap-1 ${
                          unit.avg_experience >= 80 ? 'text-green-600' : 
                          unit.avg_experience >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {unit.avg_experience >= 80 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            {unit.avg_experience.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dataLevel === 'aggregate' ? (
                        unit.survey_count
                      ) : (
                        unit.responses && unit.enrolments ? `${unit.responses}/${unit.enrolments}` : 'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.avg_response_rate ? `${unit.avg_response_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                    {getContextualInsights(units?.[0] || {}).length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {getContextualInsights(unit).slice(0, 2).map((insight, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                insight.includes('High') ? 'bg-green-100 text-green-800' :
                                insight.includes('Attention') ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {insight}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === 'comparison' ? (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Unit Comparison ({selectedUnits.length} selected)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparison Table */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Experience
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Surveys
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Response Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {units?.filter((unit: any) => selectedUnits.includes(unit.unit_code)).map((unit: any) => (
                      <tr key={unit.unit_code}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          <Link
                            to={`/unit/${unit.unit_code}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            {unit.unit_code}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {unit.avg_experience ? (
                            <span className={
                              unit.avg_experience >= 80 ? 'text-green-600' : 
                              unit.avg_experience >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {unit.avg_experience.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {unit.survey_count}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {unit.avg_response_rate ? `${unit.avg_response_rate.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Insights Summary */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Comparison Insights</h4>
              <div className="space-y-3">
                {(() => {
                  const selectedUnitData = units?.filter((unit: any) => selectedUnits.includes(unit.unit_code)) || [];
                  const avgExperience = selectedUnitData.reduce((sum: number, unit: any) => sum + (unit.avg_experience || 0), 0) / selectedUnitData.length;
                  const highPerformers = selectedUnitData.filter((unit: any) => unit.avg_experience >= 80);
                  const lowPerformers = selectedUnitData.filter((unit: any) => unit.avg_experience < 65);
                  
                  return (
                    <>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">Average Experience</div>
                        <div className="text-lg font-semibold text-primary-600">
                          {avgExperience.toFixed(1)}%
                        </div>
                      </div>
                      
                      {highPerformers.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-800">
                            High Performers ({highPerformers.length})
                          </div>
                          <div className="text-sm text-green-600">
                            {highPerformers.map((unit: any) => unit.unit_code).join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {lowPerformers.length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-sm font-medium text-red-800">
                            Need Attention ({lowPerformers.length})
                          </div>
                          <div className="text-sm text-red-600">
                            {lowPerformers.map((unit: any) => unit.unit_code).join(', ')}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units?.map((unit: any) => {
            const insights = getContextualInsights(unit);
            const performanceTier = getPerformanceTier(unit.avg_experience || 0);
            
            return (
              <div key={unit.unit_code} className="relative">
                {adaptiveConfig?.enableComparison && (
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={selectedUnits.includes(unit.unit_code)}
                      onChange={() => toggleUnitSelection(unit.unit_code)}
                    />
                  </div>
                )}
                <Link
                  to={dataLevel === 'aggregate' ? `/unit/${unit.unit_code}` : `/unit/${unit.unit_code}#survey-${unit.survey_id}`}
                  className="block"
                >
                  <Card className={`p-6 hover:shadow-md transition-shadow ${
                    adaptiveConfig?.showPerformanceTiers
                      ? performanceTier === 'high'
                        ? 'border-l-4 border-green-500'
                        : performanceTier === 'low'
                        ? 'border-l-4 border-red-500'
                        : 'border-l-4 border-yellow-500'
                      : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={adaptiveConfig?.enableComparison ? 'ml-8' : ''}>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {unit.unit_code}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {unit.unit_name}
                        </p>
                      </div>
                      {unit.avg_experience && (
                        <div className={`flex items-center gap-1 ${
                          unit.avg_experience >= 80 ? 'text-green-600' : 
                          unit.avg_experience >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {unit.avg_experience >= 80 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            {unit.avg_experience.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{unit.discipline_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {dataLevel === 'aggregate' ? (
                            <>
                              {unit.campus_count > 1 ? `${unit.campus_count} campuses` : unit.campuses || 'No data'}
                              {unit.modes && (unit.mode_count > 1 ? ` • ${unit.mode_count} modes` : ` • ${unit.modes}`)}
                            </>
                          ) : (
                            <>
                              {unit.campuses} • {unit.modes}
                              {unit.year && unit.semester && (
                                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                                  {unit.semester} {unit.year}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        {dataLevel === 'aggregate' ? (
                          <>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDataLevel('individual');
                                setFilters({...filters, search: unit.unit_code});
                              }}
                              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                            >
                              {unit.survey_count} survey{unit.survey_count !== 1 ? 's' : ''} →
                            </button>
                            {unit.avg_response_rate && (
                              <span>{unit.avg_response_rate.toFixed(1)}% response rate</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">
                              Survey Event #{unit.survey_id}
                            </span>
                            <div className="text-right">
                              {unit.responses && unit.enrolments && (
                                <div className="text-xs text-gray-500">
                                  {unit.responses}/{unit.enrolments} responses
                                </div>
                              )}
                              {unit.avg_response_rate && (
                                <span className="text-sm">{unit.avg_response_rate.toFixed(1)}%</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {insights.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {insights.slice(0, 2).map((insight, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                insight.includes('High') ? 'bg-green-100 text-green-800' :
                                insight.includes('Attention') ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {insight}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {units && units.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Grid3X3 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or import some survey data.
          </p>
        </div>
      )}
    </div>
  );
}