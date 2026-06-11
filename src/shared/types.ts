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

export type ProviderId = 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'openai' | 'custom';

// The canonical settings shape returned by settings:get / settings:set.
// Never carries the API key itself — only whether one exists (hasKey).
export interface AppSettings {
  databasePath: string;
  provider: ProviderId;
  baseUrl: string;
  aiModel: string;
  showOnboardingOnStartup: boolean;
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

export interface ExportReportResult {
  success: boolean;
  path?: string;
  error?: string;
}

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
}
