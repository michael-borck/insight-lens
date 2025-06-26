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
  },
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // Import surveys
  importSurveys: (filePaths: string[]) => ipcRenderer.invoke('surveys:import', filePaths),
  
  // External links
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
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
  extractPDF: (filePath: string) => Promise<any>;
  getSettings: () => Promise<any>;
  setSettings: (settings: any) => Promise<void>;
  hasEnvKey: (apiUrl: string) => Promise<{ hasKey: boolean; source: string | null }>;
  testConnection: (apiUrl: string, apiKey: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onMenuAction: (callback: (action: string) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  importSurveys: (filePaths: string[]) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}