import { safeStorage } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import { resolveEffectiveKey, inferProviderFromUrl } from '../ai/providers';
import { AiConfig, ProviderId } from '../ai/types';

// API key storage — encrypted at rest via Electron safeStorage when the OS
// supports it (Keychain/DPAPI/libsecret), with a plaintext fallback so
// nothing breaks on Linux setups without a secret store.
export const storeApiKey = (store: Store, key: string) => {
  if (!key) {
    store.delete('apiKey');
    store.delete('apiKeyEncrypted');
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    store.set('apiKeyEncrypted', safeStorage.encryptString(key).toString('base64'));
    store.delete('apiKey');
  } else {
    log.warn('safeStorage encryption unavailable; storing API key in plaintext');
    store.set('apiKey', key);
    store.delete('apiKeyEncrypted');
  }
};

export const getStoredApiKey = (store: Store): string => {
  const encrypted = store.get('apiKeyEncrypted', '') as string;
  if (encrypted) {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('safeStorage encryption unavailable; cannot decrypt stored API key');
      return '';
    }
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    } catch (error) {
      log.error('Failed to decrypt stored API key:', error);
      return '';
    }
  }
  // Legacy plaintext key: use it, and migrate it to encrypted storage now.
  const plaintext = store.get('apiKey', '') as string;
  if (plaintext && safeStorage.isEncryptionAvailable()) {
    store.set('apiKeyEncrypted', safeStorage.encryptString(plaintext).toString('base64'));
    store.delete('apiKey');
  }
  return plaintext;
};

// Resolve the current provider, migrating legacy apiUrl-based config once.
export const getProvider = (store: Store): ProviderId => {
  let provider = store.get('provider', '') as string;
  if (!provider) {
    const legacyUrl = store.get('apiUrl', '') as string;
    provider = inferProviderFromUrl(legacyUrl);
    store.set('provider', provider);
    if (provider === 'custom' && legacyUrl && !store.get('baseUrl')) {
      store.set('baseUrl', legacyUrl);
    }
  }
  return provider as ProviderId;
};

// Build a resolved AiConfig (Effective key included) for an AI request.
export const buildAiConfig = (store: Store): AiConfig => {
  const provider = getProvider(store);
  return {
    provider,
    baseUrl: (store.get('baseUrl', '') as string) || undefined,
    model: store.get('aiModel', '') as string,
    apiKey: resolveEffectiveKey(provider, getStoredApiKey(store)),
  };
};
