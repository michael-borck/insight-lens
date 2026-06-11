import { contextBridge, ipcRenderer, webUtils } from 'electron';
// Type-only imports: erased at compile time, so the sandboxed preload never
// requires these modules at runtime.
import type {
  AppSettings,
  SettingsUpdate,
  ProviderInfo,
  ConnectionTestResult,
  IpcResult,
  QueryParams,
  ImportResult,
  DeleteUnitResult,
  DeleteSurveyResult,
  ExportReportResult,
} from '../shared/types';
import type {
  PromotionAnalysisFilters,
  UnitPromotionData,
  PromotionReport,
  HighPerformingUnit,
} from '../shared/types/promotion';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  
  // Database operations
  query: (name: string, params?: QueryParams) => ipcRenderer.invoke('query', name, params),
  queryReadonly: (sql: string) => ipcRenderer.invoke('db:queryReadonly', sql),
  getDatabaseStats: () => ipcRenderer.invoke('db:getStats'),
  getSampleData: () => ipcRenderer.invoke('db:getSampleData'),
  getDataAvailability: () => ipcRenderer.invoke('db:getDataAvailability'),
  getCourseRecommendationData: (surveyId: number) => ipcRenderer.invoke('db:getCourseRecommendationData', surveyId),
  
  // AI operations
  askInsightLens: (question: string) => ipcRenderer.invoke('ai:askInsightLens', question),
  generateRecommendations: (surveyId: number) => ipcRenderer.invoke('ai:generateRecommendations', surveyId),
  
  // PDF extraction
  extractPDF: (filePath: string) => ipcRenderer.invoke('pdf:extract', filePath),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: SettingsUpdate) => ipcRenderer.invoke('settings:set', settings),
  getProviders: () => ipcRenderer.invoke('settings:getProviders'),
  hasEnvKey: (provider: string) => ipcRenderer.invoke('settings:hasEnvKey', provider),
  testConnection: (provider: string, baseUrl: string, apiKey: string) => ipcRenderer.invoke('settings:testConnection', provider, baseUrl, apiKey),
  fetchModels: (provider: string, baseUrl: string, apiKey: string) => ipcRenderer.invoke('settings:fetchModels', provider, baseUrl, apiKey),
  
  // Menu events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-import', () => callback('import'));
    ipcRenderer.on('menu-settings', () => callback('settings'));
    ipcRenderer.on('menu-check-updates', () => callback('check-updates'));
  },
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  getVersion: () => ipcRenderer.invoke('updater:get-version'),
  onUpdaterEvent: (callback: (event: string, data?: any) => void) => {
    ipcRenderer.on('updater-checking-for-update', () => callback('checking-for-update'));
    ipcRenderer.on('updater-update-available', (_, info) => callback('update-available', info));
    ipcRenderer.on('updater-update-not-available', (_, info) => callback('update-not-available', info));
    ipcRenderer.on('updater-error', (_, error) => callback('error', error));
    ipcRenderer.on('updater-download-progress', (_, progress) => callback('download-progress', progress));
    ipcRenderer.on('updater-update-downloaded', (_, info) => callback('update-downloaded', info));
  },
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // Import surveys
  importSurveys: (filePaths: string[]) => ipcRenderer.invoke('surveys:import', filePaths),

  // File path resolution. Electron 32+ removed File.path from the renderer's
  // File object; renderer code must call webUtils.getPathForFile(file) via
  // a preload-exposed bridge to get the real on-disk path. Both drag-and-drop
  // and <input type="file"> selections produce File objects without .path now,
  // so the Import page (and anywhere else that takes File objects) needs this.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Destructive operations — separate channels (not in `query`) so they're
  // explicit at the call site and easy to grep for.
  deleteUnit: (unitCode: string) => ipcRenderer.invoke('unit:delete', unitCode),
  deleteSurvey: (surveyId: number) => ipcRenderer.invoke('survey:delete', surveyId),
  
  // External links
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Promotion analysis
  analyzeUnitsForPromotion: (filters: PromotionAnalysisFilters) => ipcRenderer.invoke('promotion:analyzeUnits', filters),
  getHighPerformingUnits: (minSatisfaction?: number) => ipcRenderer.invoke('promotion:getHighPerformers', minSatisfaction),
  generatePromotionReport: (unitCode: string, filters: PromotionAnalysisFilters) => ipcRenderer.invoke('promotion:generateReport', unitCode, filters),
  generatePromotionSummary: (filters: PromotionAnalysisFilters) => ipcRenderer.invoke('promotion:generateSummary', filters),
  exportPromotionReport: (target: string, format: 'pdf' | 'html' | 'text', filters: PromotionAnalysisFilters, filename: string) =>
    ipcRenderer.invoke('promotion:exportReport', target, format, filters, filename)
});

// Type definitions for TypeScript
export interface ElectronAPI {
  openFile: () => Promise<Electron.OpenDialogReturnValue>;
  selectFolder: () => Promise<Electron.OpenDialogReturnValue>;
  query: (name: string, params?: QueryParams) => Promise<any[]>;
  queryReadonly: (sql: string) => Promise<any[]>;
  getDatabaseStats: () => Promise<any>;
  getSampleData: () => Promise<any>;
  getDataAvailability: () => Promise<any>;
  getCourseRecommendationData: (surveyId: number) => Promise<any>;
  askInsightLens: (question: string) => Promise<any>;
  generateRecommendations: (surveyId: number) => Promise<any>;
  extractPDF: (filePath: string) => Promise<any>;
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: SettingsUpdate) => Promise<AppSettings>;
  getProviders: () => Promise<ProviderInfo[]>;
  hasEnvKey: (provider: string) => Promise<{ hasKey: boolean; source: string | null }>;
  testConnection: (provider: string, baseUrl: string, apiKey: string) => Promise<ConnectionTestResult>;
  fetchModels: (provider: string, baseUrl: string, apiKey: string) => Promise<string[]>;
  onMenuAction: (callback: (action: string) => void) => void;
  checkForUpdates: () => Promise<{ success?: boolean; error?: string; result?: any }>;
  installUpdate: () => Promise<void>;
  getVersion: () => Promise<string>;
  onUpdaterEvent: (callback: (event: string, data?: any) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  importSurveys: (filePaths: string[]) => Promise<ImportResult>;
  getPathForFile: (file: File) => string;
  deleteUnit: (unitCode: string) => Promise<DeleteUnitResult>;
  deleteSurvey: (surveyId: number) => Promise<DeleteSurveyResult>;
  openExternal: (url: string) => Promise<void>;
  analyzeUnitsForPromotion: (filters: PromotionAnalysisFilters) => Promise<IpcResult<UnitPromotionData[]>>;
  getHighPerformingUnits: (minSatisfaction?: number) => Promise<IpcResult<HighPerformingUnit[]>>;
  generatePromotionReport: (unitCode: string, filters: PromotionAnalysisFilters) => Promise<IpcResult<{ report: PromotionReport; html: string; text: string }>>;
  generatePromotionSummary: (filters: PromotionAnalysisFilters) => Promise<IpcResult<{ summary: unknown; html: string; text: string }>>;
  exportPromotionReport: (target: string, format: 'pdf' | 'html' | 'text', filters: PromotionAnalysisFilters, filename: string) => Promise<ExportReportResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}