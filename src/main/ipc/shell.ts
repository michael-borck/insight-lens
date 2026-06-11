import { ipcMain, shell } from 'electron';
import log from 'electron-log';

export function registerShellHandlers() {
  // Shell operations — only http(s) URLs may leave the app (blocks file:,
  // javascript:, custom schemes etc. from renderer-supplied input).
  ipcMain.handle('shell:openExternal', async (event, url: string) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      log.warn('Blocked openExternal for invalid URL:', url);
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      log.warn('Blocked openExternal for non-http(s) URL:', url);
      return;
    }
    try {
      await shell.openExternal(url);
    } catch (error) {
      log.error('Failed to open external URL:', error);
      throw error;
    }
  });
}
