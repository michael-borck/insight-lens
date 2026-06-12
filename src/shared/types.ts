// Shared types between main and renderer processes

export interface SurveyData {
  unit_info: {
    unit_code?: string;
    unit_name?: string;
    campus_name?: string;
    mode?: string;
    term?: string;
    year?: string;
  };
  response_stats: {
    enrollments?: number;
    responses?: number;
    response_rate?: number;
  };
  percentage_agreement: {
    engagement?: number;
    resources?: number;
    support?: number;
    assessments?: number;
    expectations?: number;
    overall?: number;
  };
  benchmarks: any[];
  detailed_results: any;
  comments: string[];
}

export type ProviderId = 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'openai' | 'ollama' | 'custom';

// UI theme preference. 'system' follows the OS prefers-color-scheme setting.
export type ThemePreference = 'light' | 'dark' | 'system';

// The canonical settings shape returned by settings:get / settings:set.
// Never carries the API key itself — only whether one exists (hasKey).
export interface AppSettings {
  databasePath: string;
  provider: ProviderId;
  baseUrl: string;
  aiModel: string;
  showOnboardingOnStartup: boolean;
  autoBackupBeforeImport: boolean;
  theme: ThemePreference;
  hasKey: boolean;
}

// What the renderer may send to settings:set. apiKey is transient: the main
// process stores it (encrypted when the OS supports it) and never echoes it back.
export interface SettingsUpdate {
  databasePath?: string;
  provider?: ProviderId;
  baseUrl?: string;
  apiKey?: string;
  aiModel?: string;
  showOnboardingOnStartup?: boolean;
  autoBackupBeforeImport?: boolean;
  theme?: ThemePreference;
}

export interface ProviderInfo {
  id: string;
  label: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  custom: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Envelope for IPC handlers that return { success, data } / { success, error }.
// Discriminated on `success` so checking it narrows the type.
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Named-query parameters (ADR-0001: queries cross the boundary by name, never as SQL).
export type QueryParams = Record<string, unknown>;

export interface DeleteUnitResult {
  success: boolean;
  surveys_deleted?: number;
  comments_deleted?: number;
  offerings_deleted?: number;
  unit_removed?: boolean;
  error?: string;
}

export interface DeleteSurveyResult {
  success: boolean;
  unit_code?: string | null;
  comments_deleted?: number;
  offering_removed?: boolean;
  unit_removed?: boolean;
  error?: string;
}

// Result of 'delete:undo' — restores the last unit/survey delete from the
// main process's single undo slot. Discriminated on `success` like IpcResult.
export type UndoDeleteResult =
  | { success: true; restored: 'unit' | 'survey'; label: string }
  | { success: false; error: string };

export interface ExportReportResult {
  success: boolean;
  path?: string;
  error?: string;
}

// Chart spec shape produced by 'ai:askInsightLens'. The data.sql is the
// AI-authored SELECT that only the main process ever executes (read-only
// connection, SELECT-only, row cap) — the renderer has no SQL channel.
export interface AiChartSpec {
  chartType: 'line' | 'bar' | 'table' | 'summary';
  title: string;
  data: {
    sql: string;
    xAxis?: string;
    yAxis?: string;
    series?: string;
    groupBy?: string;
  };
  insights?: string;
}

// A pinned chart as exposed to the renderer by 'charts:list'. The spec is
// SQL-stripped: the renderer references pins by id only and the stored SQL
// never crosses the IPC boundary back out of the main process.
export interface PinnedChartMeta {
  id: string;
  question: string;
  createdAt: string;
  spec: {
    chartType: AiChartSpec['chartType'];
    title: string;
    data: { xAxis?: string; yAxis?: string; series?: string; groupBy?: string };
    insights?: string;
  };
}

// Result of 'charts:pin' — discriminated on `success` like IpcResult.
export type PinChartResult =
  | { success: true; id: string }
  | { success: false; error: string };

export interface ImportResult {
  success: number;
  duplicates: number;
  failed: number;
  details: ImportResultDetail[];
}

export interface ImportResultDetail {
  file: string;
  status: 'success' | 'duplicate' | 'failed';
  format?: string;
  unit?: string;
  period?: string;
  error?: string;
  /** Change alert vs the unit's chronologically previous survey (deltas are
   *  new minus previous, rounded to 1dp). Omitted for a first-ever survey. */
  changes?: { prevPeriod: string; overallDelta: number; responseRateDelta: number };
}
