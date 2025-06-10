import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown, Users, Calendar, Grid3X3 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface FilterState {
  search: string;
  campus: string;
  year: string;
  semester: string;
  discipline: string;
}

export function Units() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    campus: '',
    year: '',
    semester: '',
    discipline: ''
  });

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

  // Fetch filtered units
  const { data: units, isLoading } = useQuery({
    queryKey: ['units', filters],
    queryFn: async () => {
      let sql = `
        SELECT 
          u.unit_code,
          u.unit_name,
          d.discipline_name,
          COUNT(DISTINCT us.survey_id) as survey_count,
          AVG(us.overall_experience) as avg_experience,
          AVG(us.response_rate) as avg_response_rate,
          MAX(uo.year || '-' || uo.semester) as latest_period,
          uo.location as latest_campus,
          uo.mode as latest_mode
        FROM unit u
        LEFT JOIN discipline d ON u.discipline_code = d.discipline_code
        LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
        LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
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
      
      sql += `
        GROUP BY u.unit_code, u.unit_name, d.discipline_name, uo.location, uo.mode
        ORDER BY u.unit_code
      `;
      
      return window.electronAPI.queryDatabase(sql, params);
    }
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      campus: '',
      year: '',
      semester: '',
      discipline: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Units</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse and filter all units in your database
        </p>
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

          {/* Campus */}
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

          {/* Year */}
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

          {/* Semester */}
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

          {/* Discipline */}
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

      {/* Units Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading units...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units?.map((unit: any) => (
            <Link
              key={unit.unit_code}
              to={`/unit/${unit.unit_code}`}
              className="block"
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
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
                  
                  {unit.latest_campus && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{unit.latest_campus} - {unit.latest_mode}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span>{unit.survey_count} survey{unit.survey_count !== 1 ? 's' : ''}</span>
                    {unit.avg_response_rate && (
                      <span>{unit.avg_response_rate.toFixed(1)}% response rate</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
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