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

export interface Settings {
  databasePath: string;
  apiUrl: string;
  apiKey: string;
  aiModel: string;
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
  unit?: string;
  period?: string;
  error?: string;
}