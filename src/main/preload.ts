import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  
  // Database operations
  queryDatabase: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  executeDatabase: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
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
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  hasEnvKey: (apiUrl: string) => ipcRenderer.invoke('settings:hasEnvKey', apiUrl),
  testConnection: (apiUrl: string, apiKey: string) => ipcRenderer.invoke('settings:testConnection', apiUrl, apiKey),
  
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
  
  // External links
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Promotion analysis
  analyzeUnitsForPromotion: (filters: any) => ipcRenderer.invoke('promotion:analyzeUnits', filters),
  getHighPerformingUnits: (minSatisfaction?: number) => ipcRenderer.invoke('promotion:getHighPerformers', minSatisfaction),
  generatePromotionReport: (unitData: any) => ipcRenderer.invoke('promotion:generateReport', unitData),
  generatePromotionSummary: (unitsData: any[]) => ipcRenderer.invoke('promotion:generateSummary', unitsData),
  exportPromotionReport: (format: 'pdf' | 'html' | 'text', content: string, filename: string) => 
    ipcRenderer.invoke('promotion:exportReport', format, content, filename)
});

// Type definitions for TypeScript
export interface ElectronAPI {
  openFile: () => Promise<Electron.OpenDialogReturnValue>;
  selectFolder: () => Promise<Electron.OpenDialogReturnValue>;
  queryDatabase: (sql: string, params?: any[]) => Promise<any[]>;
  executeDatabase: (sql: string, params?: any[]) => Promise<any>;
  getDatabaseStats: () => Promise<any>;
  getSampleData: () => Promise<any>;
  getDataAvailability: () => Promise<any>;
  getCourseRecommendationData: (surveyId: number) => Promise<any>;
  askInsightLens: (question: string) => Promise<any>;
  generateRecommendations: (surveyId: number) => Promise<any>;
  extractPDF: (filePath: string) => Promise<any>;
  getSettings: () => Promise<any>;
  setSettings: (settings: any) => Promise<void>;
  hasEnvKey: (apiUrl: string) => Promise<{ hasKey: boolean; source: string | null }>;
  testConnection: (apiUrl: string, apiKey: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onMenuAction: (callback: (action: string) => void) => void;
  checkForUpdates: () => Promise<{ success?: boolean; error?: string; result?: any }>;
  installUpdate: () => Promise<void>;
  getVersion: () => Promise<string>;
  onUpdaterEvent: (callback: (event: string, data?: any) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  importSurveys: (filePaths: string[]) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  analyzeUnitsForPromotion: (filters: any) => Promise<any>;
  getHighPerformingUnits: (minSatisfaction?: number) => Promise<any>;
  generatePromotionReport: (unitData: any) => Promise<any>;
  generatePromotionSummary: (unitsData: any[]) => Promise<any>;
  exportPromotionReport: (format: 'pdf' | 'html' | 'text', content: string, filename: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}