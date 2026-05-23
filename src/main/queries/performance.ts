// Performance Reports queries (filter options + the filtered report list). ADR-0001.
import type { DatabaseSync } from 'node:sqlite';

type DB = DatabaseSync;

export interface PerformanceFilters {
  year?: number | string;
  semester?: string;
  campus?: string;
  discipline?: string; // discipline_name
  reportType?: 'star-performers' | 'needs-attention' | 'complete-summary';
  satisfactionThreshold?: number;
}

export function getPerformanceFilterOptions(db: DB) {
  const years = (db
    .prepare(`SELECT DISTINCT uo.year FROM unit_offering uo JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id ORDER BY uo.year DESC`)
    .all() as any[]).map((r) => r.year);
  const semesters = (db
    .prepare(`SELECT DISTINCT uo.semester FROM unit_offering uo JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id ORDER BY uo.semester`)
    .all() as any[]).map((r) => r.semester);
  const campuses = (db
    .prepare(`SELECT DISTINCT uo.location as campus FROM unit_offering uo JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id ORDER BY uo.location`)
    .all() as any[]).map((r) => r.campus);
  const disciplines = (db
    .prepare(
      `SELECT DISTINCT d.discipline_name FROM discipline d
       JOIN unit u ON d.discipline_code = u.discipline_code
       JOIN unit_offering uo ON u.unit_code = uo.unit_code
       JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
       ORDER BY d.discipline_name`,
    )
    .all() as any[]).map((r) => r.discipline_name);
  return { years, semesters, campuses, disciplines };
}

export function getPerformanceUnits(db: DB, filters: PerformanceFilters = {}) {
  const conditions: string[] = [];
  const args: any[] = [];

  if (filters.year) {
    conditions.push('uo.year = ?');
    args.push(typeof filters.year === 'string' ? parseInt(filters.year) : filters.year);
  }
  if (filters.semester) {
    conditions.push('uo.semester = ?');
    args.push(filters.semester);
  }
  if (filters.campus) {
    conditions.push('uo.location = ?');
    args.push(filters.campus);
  }
  if (filters.discipline) {
    conditions.push('d.discipline_name = ?');
    args.push(filters.discipline);
  }
  if (filters.reportType === 'star-performers') {
    conditions.push('us.overall_experience >= ?');
    args.push(filters.satisfactionThreshold ?? 85);
  } else if (filters.reportType === 'needs-attention') {
    conditions.push('us.overall_experience < 70');
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, uo.year, uo.semester, uo.location as campus,
         us.overall_experience, us.response_rate, us.responses, us.enrolments, d.discipline_name
       FROM unit_survey us
       JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
       JOIN unit u ON uo.unit_code = u.unit_code
       JOIN discipline d ON u.discipline_code = d.discipline_code
       ${where}
       ORDER BY us.overall_experience DESC, uo.year DESC, uo.semester DESC`,
    )
    .all(...args);
}
