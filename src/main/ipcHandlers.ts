import Store from 'electron-store';
import { registerQueryHandlers } from './ipc/queries';
import { registerImportHandlers } from './ipc/import';
import { registerAiHandlers } from './ipc/ai';
import { registerSettingsHandlers } from './ipc/settings';
import { registerMutationHandlers } from './ipc/mutations';
import { registerShellHandlers } from './ipc/shell';
import { registerPromotionHandlers } from './ipc/promotion';

export function setupIpcHandlers(store: Store) {
  registerQueryHandlers();
  registerImportHandlers();
  registerAiHandlers(store);
  registerSettingsHandlers(store);
  registerMutationHandlers();
  registerShellHandlers();
  registerPromotionHandlers();
}
