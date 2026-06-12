import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import log from 'electron-log';
import Store from 'electron-store';
import { runReadonlySelect } from '../database';
import { addPin, removePin, toListView, validatePinSpec, PinnedChart } from '../pinnedCharts';
import type { AiChartSpec, PinChartResult, PinnedChartMeta } from '../../shared/types';

const STORE_KEY = 'pinnedCharts';

// Pinned AI charts. SECURITY INVARIANT: the renderer never sends SQL over
// IPC. A pin is created from the spec the main process itself produced via
// 'ai:askInsightLens'; the SQL is stored here, listed back SQL-stripped, and
// re-executed only inside the main process ('charts:execute' by id).
export function registerChartHandlers(store: Store) {
  const getPins = (): PinnedChart[] => store.get(STORE_KEY, []) as PinnedChart[];

  ipcMain.handle('charts:pin', async (_event, question: string, spec: AiChartSpec): Promise<PinChartResult> => {
    const invalid = validatePinSpec(spec);
    if (invalid) return { success: false, error: invalid };

    const pin: PinnedChart = {
      id: randomUUID(),
      question: typeof question === 'string' ? question : '',
      spec,
      createdAt: new Date().toISOString(),
    };
    const result = addPin(getPins(), pin);
    if (!result.ok) return { success: false, error: result.error };

    store.set(STORE_KEY, result.list);
    log.info('Pinned chart', pin.id, '-', pin.spec.title);
    return { success: true, id: pin.id };
  });

  ipcMain.handle('charts:unpin', async (_event, id: string): Promise<{ success: boolean }> => {
    store.set(STORE_KEY, removePin(getPins(), id));
    return { success: true };
  });

  // SQL-stripped: the renderer only needs chartType/title/axes to render.
  ipcMain.handle('charts:list', async (): Promise<PinnedChartMeta[]> => toListView(getPins()));

  ipcMain.handle('charts:execute', async (_event, id: string) => {
    try {
      const pin = getPins().find((p) => p.id === id);
      if (!pin) return { success: false, error: 'Pinned chart not found. It may have been unpinned.' };
      // Hardened read-only channel: read-only connection, SELECT-only, row cap.
      return { success: true, data: runReadonlySelect(pin.spec.data.sql) };
    } catch (error) {
      log.error('Pinned chart execution error:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
