import { ipcMain, app } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { listModels, testConnection } from '../ai/client';
import { PROVIDERS, resolveEffectiveKey, hasEnvKey } from '../ai/providers';
import { AiConfig, ProviderId } from '../ai/types';
import type { SettingsUpdate } from '../../shared/types';
import { storeApiKey, getStoredApiKey, getProvider } from './aiConfig';

export function registerSettingsHandlers(store: Store) {
  // Settings handlers — never returns the resolved key (only whether one exists).
  ipcMain.handle('settings:get', async () => {
    const provider = getProvider(store);
    return {
      databasePath: store.get('databasePath', path.join(app.getPath('userData'), 'surveys.db')),
      provider,
      baseUrl: store.get('baseUrl', '') as string,
      aiModel: store.get('aiModel', ''),
      showOnboardingOnStartup: store.get('showOnboardingOnStartup', true),
      hasKey: !!resolveEffectiveKey(provider, getStoredApiKey(store)),
    };
  });

  // Check if an API key is available from the environment for a provider.
  ipcMain.handle('settings:hasEnvKey', async (event, provider: ProviderId) => {
    return hasEnvKey(provider);
  });

  // Provider catalog for the Settings dropdown (the registry is the single source).
  ipcMain.handle('settings:getProviders', async () => {
    return Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      requiresKey: p.requiresKey,
      defaultBaseUrl: p.defaultBaseUrl,
      custom: p.id === 'custom',
    }));
  });


  // Fetch available models for a provider config (registry-driven).
  ipcMain.handle('settings:fetchModels', async (event, provider: ProviderId, baseUrl: string, apiKey: string) => {
    const cfg: AiConfig = {
      provider,
      baseUrl: baseUrl || undefined,
      model: '',
      apiKey: resolveEffectiveKey(provider, apiKey),
    };
    return await listModels(cfg);
  });

  // Test a provider connection (registry-driven).
  ipcMain.handle('settings:testConnection', async (event, provider: ProviderId, baseUrl: string, apiKey: string) => {
    const cfg: AiConfig = {
      provider,
      baseUrl: baseUrl || undefined,
      model: (store.get('aiModel', '') as string) || '',
      apiKey: resolveEffectiveKey(provider, apiKey),
    };
    return await testConnection(cfg);
  });

  ipcMain.handle('settings:set', async (event, settings: SettingsUpdate) => {
    if (settings.databasePath !== undefined) store.set('databasePath', settings.databasePath);
    if (settings.provider !== undefined) store.set('provider', settings.provider);
    if (settings.baseUrl !== undefined) store.set('baseUrl', settings.baseUrl);
    if (settings.apiKey !== undefined) storeApiKey(store, settings.apiKey);
    if (settings.aiModel !== undefined) store.set('aiModel', settings.aiModel);
    if (settings.showOnboardingOnStartup !== undefined) store.set('showOnboardingOnStartup', settings.showOnboardingOnStartup);

    // Return the canonical settings so the renderer can write-through (never includes the key).
    const provider = getProvider(store);
    return {
      databasePath: store.get('databasePath', path.join(app.getPath('userData'), 'surveys.db')),
      provider,
      baseUrl: store.get('baseUrl', '') as string,
      aiModel: store.get('aiModel', ''),
      showOnboardingOnStartup: store.get('showOnboardingOnStartup', true),
      hasKey: !!resolveEffectiveKey(provider, getStoredApiKey(store)),
    };
  });
}
