import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Globe, RefreshCw, Download, CheckCircle, Bot, Sparkles, DatabaseBackup, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useStore, ProviderId, ThemePreference } from '../utils/store';
import { logger } from '../utils/logger';

interface ProviderOption {
  id: ProviderId;
  label: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  custom: boolean;
}

export function Settings() {
  const { settings, setSettings: updateStore } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [apiKey, setApiKey] = useState(''); // transient: a key the user types, never stored in app state
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [testing, setTesting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [envKeyInfo, setEnvKeyInfo] = useState<{ hasKey: boolean; source: string | null }>({ hasKey: false, source: null });
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const selectedProvider = providers.find((p) => p.id === localSettings.provider);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    window.electronAPI.getVersion().then(setCurrentVersion);
    window.electronAPI.getProviders().then((list) => setProviders(list as ProviderOption[])).catch((error) => {
      logger.error('Failed to load providers:', error);
    });
  }, []);

  const handleSave = async () => {
    try {
      const payload: any = {
        databasePath: localSettings.databasePath,
        provider: localSettings.provider,
        baseUrl: localSettings.baseUrl,
        aiModel: localSettings.aiModel,
        showOnboardingOnStartup: localSettings.showOnboardingOnStartup,
        autoBackupBeforeImport: localSettings.autoBackupBeforeImport,
        theme: localSettings.theme,
      };
      if (apiKey) payload.apiKey = apiKey; // only send a freshly typed key
      const saved = await window.electronAPI.setSettings(payload);
      updateStore(saved); // write-through: mirror exactly what main persisted
      setApiKey('');
      toast.success('Settings saved successfully');
    } catch (error) {
      logger.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const selectDatabasePath = async () => {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled && result.filePaths[0]) {
      const dbPath = `${result.filePaths[0]}/surveys.db`;
      setLocalSettings({ ...localSettings, databasePath: dbPath });
    }
  };

  const backupNow = async () => {
    setBackingUp(true);
    try {
      const result = await window.electronAPI.backupDatabase();
      if (result.success) {
        toast.success(`Backup saved to ${result.path}`);
      } else if (result.error === 'Backup cancelled') {
        toast.info('Backup cancelled');
      } else {
        toast.error(result.error || 'Backup failed');
      }
    } catch (error) {
      logger.error('Backup failed:', error);
      toast.error('Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const result = await window.electronAPI.testConnection(localSettings.provider, localSettings.baseUrl, apiKey);
      if (result.success) {
        toast.success(result.message || 'Connection successful!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (error) {
      logger.error('Connection test error:', error);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const models = await window.electronAPI.fetchModels(localSettings.provider, localSettings.baseUrl, apiKey);
      setAvailableModels(models || []);
    } catch (error) {
      logger.debug('Failed to fetch models:', error);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const checkEnvKey = async (provider: ProviderId) => {
    try {
      const result = await window.electronAPI.hasEnvKey(provider);
      setEnvKeyInfo(result);
    } catch (error) {
      logger.error('Failed to check environment key:', error);
      setEnvKeyInfo({ hasKey: false, source: null });
    }
  };

  // Refresh models and env-key status when the provider config changes.
  useEffect(() => {
    if (localSettings.provider) {
      fetchModels();
      checkEnvKey(localSettings.provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSettings.provider, localSettings.baseUrl, apiKey]);

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.info('Checking for updates... You will be notified if an update is available.');
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    }
    setCheckingUpdates(false);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings) || apiKey.length > 0;
  const keyOptional = !!selectedProvider && !selectedProvider.requiresKey;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Settings</h1>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
          Manage your InsightLens preferences
        </p>
      </div>

      {/* Data Storage */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100">Data Storage</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              Where your survey data is stored
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localSettings.databasePath}
                onChange={(e) => setLocalSettings({ ...localSettings, databasePath: e.target.value })}
                className="flex-1 px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 text-sm text-primary-600 dark:text-primary-300"
                placeholder="Choose a folder..."
                readOnly
              />
              <Button onClick={selectDatabasePath} variant="secondary">
                Choose Folder
              </Button>
            </div>
            <p className="mt-1 text-xs text-primary-600 dark:text-primary-300">
              Tip: Choose a cloud-synced folder (OneDrive, Dropbox, iCloud) for automatic backup
            </p>
          </div>

          <div className="pt-4 border-t border-primary-100 dark:border-primary-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-700 dark:text-primary-200">Database backup</p>
                <p className="text-xs text-primary-600 dark:text-primary-300 mt-0.5">
                  Save a clean copy of your survey database to a file of your choice
                </p>
              </div>
              <Button
                onClick={backupNow}
                variant="secondary"
                disabled={backingUp}
                className="flex items-center gap-2"
              >
                {backingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <DatabaseBackup className="w-4 h-4" />
                    Back up now
                  </>
                )}
              </Button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localSettings.autoBackupBeforeImport}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, autoBackupBeforeImport: e.target.checked })
                }
                className="mt-1 rounded border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-200 focus:ring-primary-400"
              />
              <span>
                <span className="block text-sm font-medium text-primary-700 dark:text-primary-200">
                  Automatically back up before each import
                </span>
                <span className="block text-xs text-primary-600 dark:text-primary-300 mt-0.5">
                  Keeps the 5 most recent automatic backups in the app's data folder, so an import
                  that goes wrong can always be undone.
                </span>
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* General */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100">General</h2>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={localSettings.showOnboardingOnStartup}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, showOnboardingOnStartup: e.target.checked })
            }
            className="mt-1 rounded border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-200 focus:ring-primary-400"
          />
          <span>
            <span className="block text-sm font-medium text-primary-700 dark:text-primary-200">
              Show welcome screen on startup
            </span>
            <span className="block text-xs text-primary-600 dark:text-primary-300 mt-0.5">
              Display the onboarding slides each time InsightLens launches. Turn this off to skip
              the welcome screen in the future.
            </span>
          </span>
        </label>
      </Card>


      {/* Appearance */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100">Appearance</h2>
        </div>
        <p className="text-sm text-primary-600 dark:text-primary-300 mb-4">
          Choose how InsightLens looks on this computer.
        </p>

        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
            Theme
          </label>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex rounded-md border border-primary-200 dark:border-primary-600 overflow-hidden"
          >
            {([
              { value: 'light' as ThemePreference, label: 'Light', icon: Sun },
              { value: 'dark' as ThemePreference, label: 'Dark', icon: Moon },
              { value: 'system' as ThemePreference, label: 'System', icon: Monitor },
            ]).map((option, index) => {
              const selected = localSettings.theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLocalSettings({ ...localSettings, theme: option.value })}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors ${
                    index > 0 ? 'border-l border-primary-200 dark:border-primary-600' : ''
                  } ${
                    selected
                      ? 'bg-primary-800 text-primary-100 dark:bg-primary-200 dark:text-primary-900'
                      : 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-primary-600 dark:text-primary-300">
            "System" follows your operating system's light or dark setting automatically.
          </p>
        </div>
      </Card>

      {/* AI Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-5 h-5 text-primary-600 dark:text-primary-300" />
          <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100">AI Assistant</h2>
          <span className="text-xs text-primary-600 dark:text-primary-300 font-normal ml-1">Optional</span>
        </div>
        <p className="text-sm text-primary-600 dark:text-primary-300 mb-4">
          Connect an AI service to ask questions about your survey data using natural language.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              AI Service
            </label>
            <select
              value={localSettings.provider}
              onChange={(e) => {
                setLocalSettings({ ...localSettings, provider: e.target.value as ProviderId, aiModel: '', baseUrl: '' });
                setAvailableModels([]);
              }}
              className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {selectedProvider?.custom && (
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
                Service address
              </label>
              <input
                type="text"
                value={localSettings.baseUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
                placeholder="e.g., http://localhost:11434/v1"
              />
              <p className="mt-1 text-xs text-primary-600 dark:text-primary-300">
                The web address of your OpenAI-compatible service (Ollama, a local server, or a proxy).
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              Secret key {keyOptional && <span className="text-primary-600 dark:text-primary-300 font-normal">(may not be required)</span>}
              {envKeyInfo.hasKey && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-success-900/40 dark:text-success-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Auto-detected
                </span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
              placeholder={
                localSettings.hasKey
                  ? 'A key is already saved — leave blank to keep it'
                  : envKeyInfo.hasKey
                    ? 'Detected automatically — leave blank to use it'
                    : keyOptional
                      ? 'Usually not needed for local AI'
                      : 'Paste your secret key here'
              }
            />
            <p className="mt-1 text-xs text-primary-600 dark:text-primary-300">
              {localSettings.hasKey ? (
                <>
                  <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
                  A key is saved on this computer. Leave this blank to keep it, or type a new one to replace it.
                </>
              ) : envKeyInfo.hasKey ? (
                <>
                  <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
                  A key was found on your system automatically. Leave this blank to use it.
                </>
              ) : keyOptional
                ? 'Local AI usually works without a key. Only add one if your IT team requires it.'
                : 'Your key is stored on this computer only and is never shared'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              AI Model
            </label>
            <div className="flex gap-2">
              {availableModels.length > 0 ? (
                <select
                  value={availableModels.includes(localSettings.aiModel) ? localSettings.aiModel : ''}
                  onChange={(e) => {
                    setLocalSettings({ ...localSettings, aiModel: e.target.value });
                  }}
                  className="flex-1 px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
                  disabled={loadingModels}
                >
                  <option value="" disabled>Select a model...</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={localSettings.aiModel || ''}
                  onChange={(e) => {
                    setLocalSettings({ ...localSettings, aiModel: e.target.value });
                  }}
                  placeholder={loadingModels ? 'Loading models...' : 'Type a model name'}
                  className="flex-1 px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
                  disabled={loadingModels}
                />
              )}

              <Button
                onClick={() => fetchModels()}
                variant="secondary"
                disabled={loadingModels}
                title="Refresh available models"
                aria-label="Refresh available models"
              >
                <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <p className="mt-1 text-xs text-primary-600 dark:text-primary-300">
              {availableModels.length > 0
                ? `${availableModels.length} models available from your AI service`
                : loadingModels
                  ? 'Fetching available models...'
                  : 'Click refresh to load available models, or type a model name'
              }
            </p>
          </div>

          <div>
            <Button
              onClick={testConnection}
              variant="secondary"
              disabled={testing}
              className="flex items-center gap-2"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Connection'
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950 rounded-md">
            <p className="text-sm text-primary-800 dark:text-primary-100">
              <Globe className="w-4 h-4 inline mr-1" />
              Works with OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Ollama, and other compatible services
            </p>
          </div>
        </div>
      </Card>

      {/* Update Section */}
      <Card className="p-6">
        <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100 mb-4">Updates</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700 dark:text-primary-200">
              You're running version <span className="font-medium">{currentVersion}</span>
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-300 mt-1">
              Check if a newer version is available
            </p>
          </div>

          <Button
            onClick={checkForUpdates}
            disabled={checkingUpdates}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {checkingUpdates ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-950 rounded-md">
          <p className="text-sm text-primary-700 dark:text-primary-200 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            Updates download automatically — you'll see a notification when one is ready
          </p>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
