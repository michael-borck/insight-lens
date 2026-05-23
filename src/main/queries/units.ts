// Units page queries (filter options, adaptive context, and the aggregate/individual lists). ADR-0001.
import type { DatabaseSync } from 'node:sqlite';

type DB = DatabaseSync;

export interface UnitFilters {
  search?: string;
  campus?: string;
  year?: number | string;
  semester?: string;
  discipline?: string; // discipline_code
}

export function getUnitFilterOptions(db: DB) {
  const campuses = (db.prepare(`SELECT DISTINCT uo.location as campus FROM unit_offering uo ORDER BY uo.location`).all() as any[]).map((r) => r.campus);
  const years = (db.prepare(`SELECT DISTINCT uo.year FROM unit_offering uo ORDER BY uo.year DESC`).all() as any[]).map((r) => r.year);
  const semesters = (db.prepare(`SELECT DISTINCT uo.semester FROM unit_offering uo ORDER BY uo.semester`).all() as any[]).map((r) => r.semester);
  const disciplines = db
    .prepare(`SELECT DISTINCT d.discipline_name, d.discipline_code FROM discipline d JOIN unit u ON d.discipline_code = u.discipline_code ORDER BY d.discipline_name`)
    .all();
  return { campuses, years, semesters, disciplines };
}

export function getUnitsDataContext(db: DB) {
  return db
    .prepare(
      `SELECT
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
       LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id`,
    )
    .get();
}

function unitWhere(filters: UnitFilters): { conditions: string[]; args: any[] } {
  const conditions: string[] = [];
  const args: any[] = [];
  if (filters.search) {
    conditions.push('(u.unit_code LIKE ? OR u.unit_name LIKE ?)');
    args.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.campus) {
    conditions.push('uo.location = ?');
    args.push(filters.campus);
  }
  if (filters.year) {
    conditions.push('uo.year = ?');
    args.push(typeof filters.year === 'string' ? parseInt(filters.year) : filters.year);
  }
  if (filters.semester) {
    conditions.push('uo.semester = ?');
    args.push(filters.semester);
  }
  if (filters.discipline) {
    conditions.push('d.discipline_code = ?');
    args.push(filters.discipline);
  }
  return { conditions, args };
}

/** One row per unit, rolling up campuses/modes/periods across all its offerings. */
export function getUnitsSummary(db: DB, filters: UnitFilters = {}) {
  const { conditions, args } = unitWhere(filters);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, d.discipline_name,
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
       ${where}
       GROUP BY u.unit_code, u.unit_name, d.discipline_name
       ORDER BY u.unit_code`,
    )
    .all(...args);
}

/** One row per survey event (the un-rolled view). */
export function getUnitsIndividual(db: DB, filters: UnitFilters = {}) {
  const { conditions, args } = unitWhere(filters);
  const extra = conditions.length ? ' AND ' + conditions.join(' AND ') : '';
  return db
    .prepare(
      `SELECT u.unit_code, u.unit_name, d.discipline_name, us.survey_id,
         us.overall_experience as avg_experience, us.response_rate as avg_response_rate,
         uo.year || '-' || uo.semester as latest_period,
         uo.location as campuses, uo.mode as modes, uo.year, uo.semester,
         us.responses, us.enrolments, 1 as survey_count
       FROM unit u
       LEFT JOIN discipline d ON u.discipline_code = d.discipline_code
       LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
       LEFT JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
       WHERE us.survey_id IS NOT NULL${extra}
       ORDER BY u.unit_code, uo.year DESC, uo.semester DESC`,
    )
    .all(...args);
}
