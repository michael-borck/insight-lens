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
  
  // PDF extraction
  extractPDF: (filePath: string) => ipcRenderer.invoke('pdf:extract', filePath),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  
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
  importSurveys: (filePaths: string[]) => ipcRenderer.invoke('surveys:import', filePaths)
});

// Type definitions for TypeScript
export interface ElectronAPI {
  openFile: () => Promise<Electron.OpenDialogReturnValue>;
  selectFolder: () => Promise<Electron.OpenDialogReturnValue>;
  queryDatabase: (sql: string, params?: any[]) => Promise<any[]>;
  executeDatabase: (sql: string, params?: any[]) => Promise<any>;
  extractPDF: (filePath: string) => Promise<any>;
  getSettings: () => Promise<any>;
  setSettings: (settings: any) => Promise<void>;
  onMenuAction: (callback: (action: string) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  importSurveys: (filePaths: string[]) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}