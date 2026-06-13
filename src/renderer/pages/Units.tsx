import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown, Users, Calendar, Grid3X3, LayoutGrid, Table2, BarChart3, ChevronUp, ChevronDown, ArrowLeft, X, Download } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { queries } from '../services/queries';
import { downloadFile, generateFilename } from '../utils/performanceExports';

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

// Persisted key for the user's explicit cards/table choice. Comparison view
// is transient (it depends on a selection) so it is never persisted.
const VIEW_MODE_STORAGE_KEY = 'insightlens.units.viewMode';

function getStoredViewMode(): ViewMode | null {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'cards' || stored === 'table' ? stored : null;
  } catch {
    return null;
  }
}

export function Units() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    campus: '',
    year: '',
    semester: '',
    discipline: ''
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode() ?? 'cards');
  // Whether the user has ever explicitly picked a view. If they have, the
  // auto-switch heuristic below must never override their choice.
  const [hasExplicitViewChoice, setHasExplicitViewChoice] = useState<boolean>(() => getStoredViewMode() !== null);

  // User-initiated view change: remember it (cards/table only).
  const selectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'cards' || mode === 'table') {
      setHasExplicitViewChoice(true);
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        // localStorage unavailable — preference just won't persist
      }
    }
  };
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [dataLevel, setDataLevel] = useState<DataLevel>('aggregate');
  // Which list view (cards/table) was active before entering comparison,
  // so "Back to ..." can restore it.
  const [preComparisonView, setPreComparisonView] = useState<'cards' | 'table'>('cards');
  // Table-view sort. `null` = keep the order the query returned (default).
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const enterComparison = () => {
    if (viewMode === 'cards' || viewMode === 'table') {
      setPreComparisonView(viewMode);
    }
    selectViewMode('comparison');
  };

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      return queries.unitFilterOptions();
    }
  });

  // Fetch data context for adaptive decisions
  const { data: dataContext } = useQuery({
    queryKey: ['units-context'],
    queryFn: async () => {
      const result = await queries.unitsDataContext();
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
      return dataLevel === 'aggregate'
        ? queries.unitsSummary(filters)
        : queries.unitsIndividual(filters);
    }
  });

  // Comparison reads from an UNFILTERED summary fetch so a selection always
  // renders complete and with aggregate metrics — regardless of the page's
  // current filters or the Survey Events data level. (Filtering the visible
  // list used to silently drop selected-but-filtered-out units from the
  // comparison while the header still counted them.)
  const { data: allUnitsSummary } = useQuery({
    queryKey: ['units-summary-all'],
    queryFn: async () => queries.unitsSummary(),
    enabled: selectedUnits.length > 0,
  });

  const comparisonData = useMemo(
    () => (allUnitsSummary ?? []).filter((u: any) => selectedUnits.includes(u.unit_code)),
    [allUnitsSummary, selectedUnits],
  );

  const unitNameFor = (code: string) =>
    (allUnitsSummary ?? []).find((u: any) => u.unit_code === code)?.unit_name as string | undefined;

  const exportComparisonCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Unit Code', 'Unit Name', 'Avg Experience (%)', 'Surveys', 'Avg Response Rate (%)'],
      ...comparisonData.map((u: any) => [
        u.unit_code,
        u.unit_name,
        u.avg_experience != null ? u.avg_experience.toFixed(1) : '',
        u.survey_count,
        u.avg_response_rate != null ? u.avg_response_rate.toFixed(1) : '',
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    downloadFile(csv, generateFilename('unit-comparison', 'csv'), 'text/csv');
  };

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

  // Auto-adjust view mode based on data context — but only when the user
  // has never explicitly chosen a view themselves.
  React.useEffect(() => {
    if (hasExplicitViewChoice) return;
    if (adaptiveConfig?.recommendedView === 'table' && viewMode === 'cards') {
      setViewMode('table');
    }
  }, [adaptiveConfig?.recommendedView, viewMode, hasExplicitViewChoice]);

  // Client-side sort for the table view. Nulls always sink to the bottom.
  const sortedUnits = useMemo(() => {
    if (!units || !sort) return units;
    const copy = [...units];
    copy.sort((a: any, b: any) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [units, sort]);

  const SortableTh = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase tracking-wider">
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className="flex items-center gap-1 uppercase tracking-wider hover:text-primary-800 dark:hover:text-primary-100 transition-colors"
        title={`Sort by ${label}`}
      >
        {label}
        {sort?.key === sortKey && (
          sort.dir === 'asc'
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
        )}
      </button>
    </th>
  );

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
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 font-serif">Units</h1>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
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
            <span className="text-sm text-primary-600 dark:text-primary-300">View:</span>
            <div className="flex rounded-md border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900">
              <button
                onClick={() => setDataLevel('aggregate')}
                title="One row per unit, averaged across all of its surveys"
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  dataLevel === 'aggregate'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
                }`}
              >
                Unit Summary
              </button>
              <button
                onClick={() => setDataLevel('individual')}
                title="One row per individual survey (each semester, campus, and mode)"
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  dataLevel === 'individual'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
                }`}
              >
                Survey Events
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-primary-500 dark:text-primary-400">
            Unit Summary averages each unit across all its surveys; Survey Events lists every individual survey offering.
          </p>
        </div>
        
        {adaptiveConfig?.enableComparison && (
          <div className="flex items-center gap-2">
            {/* Selection count + Compare live in the bottom tray, not here. */}
            <div className="flex rounded-md border border-primary-200 dark:border-primary-700">
              <button
                onClick={() => selectViewMode('cards')}
                title="Card view"
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'cards'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => selectViewMode('table')}
                title="Table view"
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
                }`}
              >
                <Table2 className="w-4 h-4" />
              </button>
              {selectedUnits.length > 1 && (
                <button
                  onClick={() => selectViewMode('comparison')}
                  title="Comparison view"
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'comparison'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
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
          <Filter className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-500 dark:text-primary-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Unit code or name..."
                className="w-full pl-10 pr-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Campus - Only show if multiple campuses exist */}
          {adaptiveConfig?.showCampusFilter && (
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
                Campus
              </label>
              <select
                value={filters.campus}
                onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
                className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm"
              >
                <option value="">All Campuses</option>
                {filterOptions?.campuses.map((campus: string) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year - Only show if historical data exists */}
          {adaptiveConfig?.showYearFilter && (
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm"
              >
                <option value="">All Years</option>
                {filterOptions?.years.map((year: number) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester - Always show as it's a common filter */}
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm"
            >
              <option value="">All Semesters</option>
              {filterOptions?.semesters.map((semester: string) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>

          {/* Discipline - Only show if multiple disciplines exist */}
          {adaptiveConfig?.showDisciplineFilter && (
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
                Discipline
              </label>
              <select
                value={filters.discipline}
                onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
                className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm"
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
          <div className="text-sm text-primary-600 dark:text-primary-300">
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
          <p className="mt-2 text-sm text-primary-600 dark:text-primary-300">Loading units...</p>
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-200 dark:divide-primary-700">
              <thead className="bg-primary-50 dark:bg-primary-950">
                <tr>
                  {adaptiveConfig?.enableComparison && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300 focus:ring-primary-300"
                        aria-label="Select all visible units"
                        checked={
                          (units?.length ?? 0) > 0 &&
                          (units ?? []).every((u: any) => selectedUnits.includes(u.unit_code))
                        }
                        onChange={(e) => {
                          // Selection persists across filters, so select-all
                          // adds/removes only the VISIBLE units.
                          const visible: string[] = (units ?? []).map((u: any) => u.unit_code);
                          setSelectedUnits((prev) =>
                            e.target.checked
                              ? [...new Set([...prev, ...visible])]
                              : prev.filter((code) => !visible.includes(code))
                          );
                        }}
                      />
                    </th>
                  )}
                  <SortableTh label="Unit" sortKey="unit_code" />
                  <SortableTh label="Discipline" sortKey="discipline_name" />
                  <SortableTh
                    label={dataLevel === 'aggregate' ? 'Latest Period' : 'Period'}
                    sortKey="latest_period"
                  />
                  <SortableTh label="Experience" sortKey="avg_experience" />
                  <SortableTh
                    label={dataLevel === 'aggregate' ? 'Surveys' : 'Responses'}
                    sortKey={dataLevel === 'aggregate' ? 'survey_count' : 'responses'}
                  />
                  <SortableTh label="Response Rate" sortKey="avg_response_rate" />
                  {getContextualInsights(units?.[0] || {}).length > 0 && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase tracking-wider">
                      Insights
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-primary-900 divide-y divide-primary-200 dark:divide-primary-700">
                {sortedUnits?.map((unit: any) => (
                  <tr key={unit.unit_code} className="hover:bg-primary-50 dark:hover:bg-primary-800">
                    {adaptiveConfig?.enableComparison && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300 focus:ring-primary-300"
                          checked={selectedUnits.includes(unit.unit_code)}
                          onChange={() => toggleUnitSelection(unit.unit_code)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={dataLevel === 'aggregate' ? `/unit/${unit.unit_code}` : `/unit/${unit.unit_code}#survey-${unit.survey_id}`}
                        className="text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 font-medium"
                      >
                        {unit.unit_code}
                        {dataLevel === 'individual' && unit.survey_id && (
                          <span className="text-xs text-primary-600 dark:text-primary-300 ml-2">#{unit.survey_id}</span>
                        )}
                      </Link>
                      <div className="text-sm text-primary-600 dark:text-primary-300 max-w-xs truncate">
                        {unit.unit_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-800 dark:text-primary-100">
                      {unit.discipline_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-primary-300">
                      {unit.latest_period}
                      <div className="text-xs text-primary-500 dark:text-primary-400">
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
                          unit.avg_experience >= 80 ? 'text-success-500 dark:text-success-300' :
                          unit.avg_experience >= 70 ? 'text-warning-500 dark:text-warning-300' : 'text-error-500 dark:text-error-300'
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
                        <span className="text-sm text-primary-500 dark:text-primary-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-800 dark:text-primary-100">
                      {dataLevel === 'aggregate' ? (
                        unit.survey_count
                      ) : (
                        unit.responses && unit.enrolments ? `${unit.responses}/${unit.enrolments}` : 'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-800 dark:text-primary-100">
                      {unit.avg_response_rate ? `${unit.avg_response_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                    {getContextualInsights(units?.[0] || {}).length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {getContextualInsights(unit).slice(0, 2).map((insight, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                insight.includes('High') ? 'bg-success-50 dark:bg-success-900/40 text-success-500 dark:text-success-300' :
                                insight.includes('Attention') ? 'bg-error-50 dark:bg-error-900/40 text-error-500 dark:text-error-300' :
                                'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200'
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">
              Unit Comparison ({comparisonData.length} unit{comparisonData.length !== 1 ? 's' : ''})
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportComparisonCsv}
                disabled={comparisonData.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectViewMode(preComparisonView)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to {preComparisonView}
              </Button>
            </div>
          </div>

          {/* Removable selection chips — adjust the comparison without leaving it */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedUnits.map((code) => (
              <span
                key={code}
                title={unitNameFor(code)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200"
              >
                {code}
                <button
                  onClick={() => toggleUnitSelection(code)}
                  aria-label={`Remove ${code} from comparison`}
                  className="hover:text-error-500 dark:hover:text-error-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {comparisonData.length === 0 ? (
            <div className="py-8 text-center text-sm text-primary-600 dark:text-primary-300">
              No units selected — go back and tick at least two units to compare.
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparison Table */}
            <div>
              <h4 className="text-sm font-medium text-primary-700 dark:text-primary-200 mb-3">Performance Metrics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-primary-200 dark:divide-primary-700">
                  <thead className="bg-primary-50 dark:bg-primary-950">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase">
                        Unit
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase">
                        Experience
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase">
                        Surveys
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase">
                        Response Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-primary-900 divide-y divide-primary-200 dark:divide-primary-700">
                    {comparisonData.map((unit: any) => (
                      <tr key={unit.unit_code}>
                        <td className="px-4 py-2 text-sm font-medium text-primary-800 dark:text-primary-100">
                          <Link
                            to={`/unit/${unit.unit_code}`}
                            className="text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100"
                          >
                            {unit.unit_code}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {unit.avg_experience ? (
                            <span className={
                              unit.avg_experience >= 80 ? 'text-success-500 dark:text-success-300' :
                              unit.avg_experience >= 70 ? 'text-warning-500 dark:text-warning-300' : 'text-error-500 dark:text-error-300'
                            }>
                              {unit.avg_experience.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-primary-500 dark:text-primary-400">No data</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-primary-800 dark:text-primary-100">
                          {unit.survey_count}
                        </td>
                        <td className="px-4 py-2 text-sm text-primary-800 dark:text-primary-100">
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
              <h4 className="text-sm font-medium text-primary-700 dark:text-primary-200 mb-3">Comparison Insights</h4>
              <div className="space-y-3">
                {(() => {
                  const avgExperience = comparisonData.reduce((sum: number, unit: any) => sum + (unit.avg_experience || 0), 0) / comparisonData.length;
                  const highPerformers = comparisonData.filter((unit: any) => unit.avg_experience >= 80);
                  const lowPerformers = comparisonData.filter((unit: any) => unit.avg_experience < 65);
                  
                  return (
                    <>
                      <div className="p-3 bg-primary-50 dark:bg-primary-950 rounded-lg">
                        <div className="text-sm font-medium text-primary-800 dark:text-primary-100">Average Experience</div>
                        <div className="text-lg font-semibold text-primary-600 dark:text-primary-300">
                          {avgExperience.toFixed(1)}%
                        </div>
                      </div>
                      
                      {highPerformers.length > 0 && (
                        <div className="p-3 bg-success-50 dark:bg-success-900/40 rounded-lg">
                          <div className="text-sm font-medium text-success-500 dark:text-success-300">
                            High Performers ({highPerformers.length})
                          </div>
                          <div className="text-sm text-success-500 dark:text-success-300">
                            {highPerformers.map((unit: any) => unit.unit_code).join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {lowPerformers.length > 0 && (
                        <div className="p-3 bg-error-50 dark:bg-error-900/40 rounded-lg">
                          <div className="text-sm font-medium text-error-500 dark:text-error-300">
                            Need Attention ({lowPerformers.length})
                          </div>
                          <div className="text-sm text-error-500 dark:text-error-300">
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
          )}
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
                      className="rounded border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300 focus:ring-primary-300"
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
                        ? 'border-l-4 border-success-500'
                        : performanceTier === 'low'
                        ? 'border-l-4 border-error-500'
                        : 'border-l-4 border-warning-500'
                      : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={adaptiveConfig?.enableComparison ? 'ml-8' : ''}>
                        <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-100 font-serif">
                          {unit.unit_code}
                        </h3>
                        <p className="text-sm text-primary-600 dark:text-primary-300 line-clamp-2">
                          {unit.unit_name}
                        </p>
                      </div>
                      {unit.avg_experience && (
                        <div className={`flex items-center gap-1 ${
                          unit.avg_experience >= 80 ? 'text-success-500 dark:text-success-300' :
                          unit.avg_experience >= 70 ? 'text-warning-500 dark:text-warning-300' : 'text-error-500 dark:text-error-300'
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

                    <div className="space-y-2 text-sm text-primary-600 dark:text-primary-300">
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
                                <span className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-800 rounded text-xs">
                                  {unit.semester} {unit.year}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-primary-200 dark:border-primary-700">
                        {dataLevel === 'aggregate' ? (
                          <>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDataLevel('individual');
                                setFilters({...filters, search: unit.unit_code});
                              }}
                              className="text-primary-600 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-100 text-sm font-medium"
                            >
                              {unit.survey_count} survey{unit.survey_count !== 1 ? 's' : ''} →
                            </button>
                            {unit.avg_response_rate && (
                              <span>{unit.avg_response_rate.toFixed(1)}% response rate</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-primary-600 dark:text-primary-300">
                              Survey Event #{unit.survey_id}
                            </span>
                            <div className="text-right">
                              {unit.responses && unit.enrolments && (
                                <div className="text-xs text-primary-600 dark:text-primary-300">
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
                                insight.includes('High') ? 'bg-success-50 dark:bg-success-900/40 text-success-500 dark:text-success-300' :
                                insight.includes('Attention') ? 'bg-error-50 dark:bg-error-900/40 text-error-500 dark:text-error-300' :
                                'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200'
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
          <div className="text-primary-500 dark:text-primary-400 mb-4">
            <Grid3X3 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif mb-2">No units found</h3>
          <p className="text-sm text-primary-600 dark:text-primary-300">
            Try adjusting your filters or import some survey data.
          </p>
        </div>
      )}

      {/* Comparison tray — selection persists across filters and view modes;
          sticks to the bottom of the scroll area while browsing. */}
      {selectedUnits.length > 0 && viewMode !== 'comparison' && (
        <div className="sticky bottom-4 z-20">
          <Card className="p-3 shadow-lg border-primary-300 dark:border-primary-600">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {selectedUnits.map((code) => (
                  <span
                    key={code}
                    title={unitNameFor(code)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200"
                  >
                    {code}
                    <button
                      onClick={() => toggleUnitSelection(code)}
                      aria-label={`Remove ${code} from selection`}
                      className="hover:text-error-500 dark:hover:text-error-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setSelectedUnits([])}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={enterComparison}
                  disabled={selectedUnits.length < 2}
                  title={selectedUnits.length < 2 ? 'Select at least two units to compare' : undefined}
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Compare {selectedUnits.length > 1 ? `${selectedUnits.length} units` : ''}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}