// Typed thin wrappers over the main-process Query Repository. The renderer calls queries by name
// and never builds SQL. See ADR-0001.

export interface UnitFilters {
  search?: string;
  campus?: string;
  year?: number | string;
  semester?: string;
  discipline?: string; // discipline_code
}

export interface PerformanceFilters {
  year?: number | string;
  semester?: string;
  campus?: string;
  discipline?: string; // discipline_name
  reportType?: 'star-performers' | 'needs-attention' | 'complete-summary';
  satisfactionThreshold?: number;
}

export interface Period {
  year: number;
  semester: string;
}

const call = <T = any[]>(name: string, params?: any): Promise<T> =>
  window.electronAPI.query(name, params) as Promise<T>;

export const queries = {
  // Dashboard
  dashboardSummary: () => call('dashboardSummary').then((r: any) => r as any),
  recentSurveys: (limit?: number) => call('recentSurveys', { limit }),
  experienceTrend: (limit?: number) => call('experienceTrend', { limit }),
  latestPeriod: () => call('latestPeriod').then((r: any) => r as any),
  topPerformers: (periods: Period[], minExperience?: number, limit?: number) =>
    call('topPerformers', { periods, minExperience, limit }),
  needsAttentionByPeriod: (periods: Period[], maxExperience?: number, limit?: number) =>
    call('needsAttentionByPeriod', { periods, maxExperience, limit }),

  // Units
  unitFilterOptions: () => call('unitFilterOptions').then((r: any) => r as any),
  unitsDataContext: () => call('unitsDataContext').then((r: any) => r as any),
  unitsSummary: (filters?: UnitFilters) => call('unitsSummary', filters),
  unitsIndividual: (filters?: UnitFilters) => call('unitsIndividual', filters),

  // Performance Reports
  performanceFilterOptions: () => call('performanceFilterOptions').then((r: any) => r as any),
  performanceUnits: (filters?: PerformanceFilters) => call('performanceUnits', filters),

  // Unit detail
  unit: (unitCode: string) => call('unit', { unitCode }).then((r: any) => r as any),
  unitSurveyHistory: (unitCode: string) => call('unitSurveyHistory', { unitCode }),
  unitLatestQuestions: (unitCode: string, limit?: number) => call('unitLatestQuestions', { unitCode, limit }),
  unitComments: (unitCode: string, limit?: number) => call('unitComments', { unitCode, limit }),
  unitTimelineSeries: (unitCode: string, questionShorts: string[]) =>
    call('unitTimelineSeries', { unitCode, questionShorts }),
  unitAvailableQuestions: (unitCode: string) => call('unitAvailableQuestions', { unitCode }),

  // Destructive mutations. Returns a result envelope with `success` + counts;
  // never throws on logical failure (only on IPC transport issues).
  deleteUnit: (unitCode: string) => window.electronAPI.deleteUnit(unitCode),
  deleteSurvey: (surveyId: number) => window.electronAPI.deleteSurvey(surveyId),

  // Quick insights
  trendingUp: (limit?: number) => call('trendingUp', { limit }),
  needsAttention: (limit?: number) => call('needsAttention', { limit }),
  sentimentTrend: (limit?: number) => call('sentimentTrend', { limit }),
};
