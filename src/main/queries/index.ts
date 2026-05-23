// The Query Repository registry: maps a query name to its function. The 'query' IPC handler calls
// runQuery(name, params); the renderer calls queries by name and never sees SQL. See ADR-0001.
import { getDatabase } from '../database';
import * as dashboard from './dashboard';
import * as units from './units';
import * as performance from './performance';
import * as unitDetail from './unitDetail';
import * as insights from './insights';

type QueryFn = (db: any, params?: any) => any;

const registry = {
  dashboardSummary: dashboard.getDashboardSummary,
  recentSurveys: dashboard.getRecentSurveys,
  experienceTrend: dashboard.getExperienceTrend,
  latestPeriod: dashboard.getLatestPeriod,
  topPerformers: dashboard.getTopPerformers,
  needsAttentionByPeriod: dashboard.getNeedsAttentionByPeriod,

  unitFilterOptions: units.getUnitFilterOptions,
  unitsDataContext: units.getUnitsDataContext,
  unitsSummary: units.getUnitsSummary,
  unitsIndividual: units.getUnitsIndividual,

  performanceFilterOptions: performance.getPerformanceFilterOptions,
  performanceUnits: performance.getPerformanceUnits,

  unit: unitDetail.getUnit,
  unitSurveyHistory: unitDetail.getUnitSurveyHistory,
  unitLatestQuestions: unitDetail.getUnitLatestQuestions,
  unitComments: unitDetail.getUnitComments,

  trendingUp: insights.getTrendingUp,
  needsAttention: insights.getNeedsAttention,
  sentimentTrend: insights.getSentimentTrend,
} satisfies Record<string, QueryFn>;

export type QueryName = keyof typeof registry;

export function runQuery(name: string, params?: any): any {
  const fn = (registry as Record<string, QueryFn>)[name];
  if (!fn) throw new Error(`Unknown query: ${name}`);
  return fn(getDatabase(), params);
}
