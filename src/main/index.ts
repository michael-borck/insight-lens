import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import path from 'path';
import Store from 'electron-store';
import { setupDatabase } from './database';
import { setupIpcHandlers } from './ipcHandlers';

// Initialize electron store for settings
const store = new Store();

// Configure electron-log
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
log.transports.file.level = 'info';
log.info('InsightLens starting up...');

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
if (process.env.NODE_ENV === 'production') {
  autoUpdater.checkForUpdatesAndNotify();
}

// Auto-updater logging
autoUpdater.logger = log;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  mainWindow?.webContents.send('updater-checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  mainWindow?.webContents.send('updater-update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available, current version:', info.version);
  mainWindow?.webContents.send('updater-update-not-available', info);
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
  mainWindow?.webContents.send('updater-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  const speedKB = Math.round(progressObj.bytesPerSecond / 1024);
  log.debug(`Update download progress: ${progressObj.percent.toFixed(1)}% (${speedKB} KB/s)`);
  mainWindow?.webContents.send('updater-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded successfully:', info.version);
  mainWindow?.webContents.send('updater-update-downloaded', info);
});

// Enable live reload for Electron in development
// Comment out for now as it causes issues with module loading
// if (process.env.NODE_ENV === 'development') {
//   require('electron-reload')(__dirname, {
//     electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
//     hardResetMethod: 'exit'
//   });
// }

function createWindow() {
  log.info('Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../public/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // Developer tools can be opened via View menu or F12 if needed
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Surveys...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-import');
          }
        },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            mainWindow?.webContents.send('menu-check-updates');
          }
        },
        { type: 'separator' },
        {
          label: 'About InsightLens',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About InsightLens',
              message: 'InsightLens',
              detail: `Unit survey analysis tool for lecturers.\n\nVersion: ${app.getVersion()}\nLicense: MIT`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/your-repo/insightlens');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'Cmd+,',
          click: () => {
            mainWindow?.webContents.send('menu-settings');
          }
        },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Set up database
  const dbPath = store.get('databasePath', path.join(app.getPath('userData'), 'surveys.db')) as string;
  await setupDatabase(dbPath);

  // Set up IPC handlers
  setupIpcHandlers(store);

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file open dialog
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// Handle folder selection dialog
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result;
});

// Auto-updater IPC handlers
ipcMain.handle('updater:check-for-updates', async () => {
  if (process.env.NODE_ENV === 'development') {
    return { error: 'Updates are only available in production builds' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error) {
    return { error: (error as Error).message };
  }
});

ipcMain.handle('updater:install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('updater:get-version', () => {
  return app.getVersion();
});