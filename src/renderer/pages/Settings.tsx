import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Key, Globe, RefreshCw, Download, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useStore } from '../utils/store';
import { logger } from '../utils/logger';

export function Settings() {
  const { settings, setSettings: updateStore } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [envKeyInfo, setEnvKeyInfo] = useState<{ hasKey: boolean; source: string | null }>({ hasKey: false, source: null });
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    
    // Get current version
    window.electronAPI.getVersion().then(setCurrentVersion);
  }, [settings]);

  const handleSave = async () => {
    try {
      await window.electronAPI.setSettings(localSettings);
      updateStore(localSettings);
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

  const testConnection = async () => {
    setTesting(true);
    try {
      const result = await window.electronAPI.testConnection(localSettings.apiUrl, localSettings.apiKey);
      
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
    if (!localSettings.apiUrl) return;
    
    // Skip model fetching for Anthropic - they don't have a public models endpoint
    if (localSettings.apiUrl.includes('anthropic.com')) {
      logger.debug('Skipping model fetch for Anthropic - using preset models');
      return;
    }
    
    setLoadingModels(true);
    try {
      const headers: HeadersInit = {};
      if (localSettings.apiKey) {
        headers['Authorization'] = `Bearer ${localSettings.apiKey}`;
      }
      
      logger.debug('Fetching models from:', localSettings.apiUrl + '/models');
      const response = await fetch(localSettings.apiUrl + '/models', {
        headers
      });
      
      logger.debug('Models response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('Models response data:', data);
        
        if (data.data && Array.isArray(data.data)) {
          const models = data.data.map((model: any) => model.id).filter(Boolean);
          logger.debug('Parsed models:', models);
          setAvailableModels(models);
          
          // If current model is not in the list, add it
          if (localSettings.aiModel && !models.includes(localSettings.aiModel)) {
            setAvailableModels([...models, localSettings.aiModel]);
          }
        } else if (data.models && Array.isArray(data.models)) {
          // Some APIs return models in a 'models' field
          const models = data.models.map((model: any) => 
            typeof model === 'string' ? model : model.name || model.id
          ).filter(Boolean);
          logger.debug('Parsed models (alt format):', models);
          setAvailableModels(models);
          
          if (localSettings.aiModel && !models.includes(localSettings.aiModel)) {
            setAvailableModels([...models, localSettings.aiModel]);
          }
        } else {
          logger.debug('Unexpected models response format:', data);
        }
      } else {
        logger.error('Failed to fetch models, status:', response.status);
      }
    } catch (error) {
      logger.error('Failed to fetch models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Check for environment API keys
  const checkEnvKey = async (apiUrl: string) => {
    try {
      const result = await window.electronAPI.hasEnvKey(apiUrl);
      setEnvKeyInfo(result);
    } catch (error) {
      logger.error('Failed to check environment key:', error);
      setEnvKeyInfo({ hasKey: false, source: null });
    }
  };

  // Fetch models when API settings change
  useEffect(() => {
    if (localSettings.apiUrl) {
      fetchModels();
      checkEnvKey(localSettings.apiUrl);
    }
  }, [localSettings.apiKey, localSettings.apiUrl]);

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

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your InsightLens preferences
        </p>
      </div>

      {/* Database Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Database Location</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localSettings.databasePath}
                onChange={(e) => setLocalSettings({ ...localSettings, databasePath: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="/path/to/database.db"
              />
              <Button onClick={selectDatabasePath} variant="secondary">
                Browse
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Store in a cloud-synced folder for automatic backup
            </p>
          </div>
        </div>
      </Card>

      {/* AI Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">AI Assistant (Optional)</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Provider
            </label>
            <select
              value={
                localSettings.apiUrl === 'https://api.openai.com' || 
                localSettings.apiUrl === 'https://api.anthropic.com' ||
                localSettings.apiUrl === 'http://localhost:11434' ||
                localSettings.apiUrl === 'https://api.openai.com/v1' || 
                localSettings.apiUrl === 'https://api.anthropic.com/v1' ||
                localSettings.apiUrl === 'http://localhost:11434/v1'
                  ? localSettings.apiUrl.replace('/v1', '') 
                  : 'custom'
              }
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomUrl(localSettings.apiUrl);
                }
                setLocalSettings({ ...localSettings, apiUrl: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="https://api.openai.com">OpenAI</option>
              <option value="https://api.anthropic.com">Claude (Anthropic)</option>
              <option value="http://localhost:11434">Ollama (Local)</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>

          {(localSettings.apiUrl !== 'https://api.openai.com' && localSettings.apiUrl !== 'https://api.anthropic.com' && localSettings.apiUrl !== 'http://localhost:11434' && localSettings.apiUrl !== 'https://api.openai.com/v1' && localSettings.apiUrl !== 'https://api.anthropic.com/v1' && localSettings.apiUrl !== 'http://localhost:11434/v1') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API URL
              </label>
              <input
                type="text"
                value={customUrl || localSettings.apiUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setLocalSettings({ ...localSettings, apiUrl: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key {(!localSettings.apiUrl.includes('openai.com') && !localSettings.apiUrl.includes('anthropic.com') && !localSettings.apiUrl.includes('localhost:11434')) && <span className="text-gray-500 font-normal">(Optional)</span>}
              {envKeyInfo.hasKey && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Environment
                </span>
              )}
            </label>
            <input
              type="password"
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={
                envKeyInfo.hasKey 
                  ? `Using ${envKeyInfo.source} from environment`
                  : localSettings.apiUrl.includes('openai.com') 
                    ? 'sk-...' 
                    : localSettings.apiUrl.includes('anthropic.com')
                      ? 'sk-ant-...'
                      : 'Enter API key if required'
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {envKeyInfo.hasKey ? (
                <>
                  <Key className="w-3 h-3 inline mr-1" />
                  Using <code className="bg-gray-100 px-1 rounded">{envKeyInfo.source}</code> from environment variables. Leave blank to use environment key.
                </>
              ) : (!localSettings.apiUrl.includes('openai.com') && !localSettings.apiUrl.includes('anthropic.com') && !localSettings.apiUrl.includes('localhost:11434'))
                ? 'Some providers may not require an API key'
                : 'Your API key is stored locally and never shared'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <div className="flex gap-2">
              <select
                value={
                  ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder'].includes(localSettings.aiModel) || 
                  availableModels.includes(localSettings.aiModel) 
                    ? localSettings.aiModel 
                    : 'custom'
                }
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    // Don't change the model, just show the input
                  } else {
                    setLocalSettings({ ...localSettings, aiModel: e.target.value });
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loadingModels}
              >
                {/* Default models for common providers */}
                {localSettings.apiUrl.includes('openai.com') && (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                )}
                
                {localSettings.apiUrl.includes('anthropic.com') && (
                  <>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  </>
                )}
                
                {localSettings.apiUrl.includes('localhost:11434') && (
                  <>
                    <option value="llama3.2">Llama 3.2</option>
                    <option value="llama3.1">Llama 3.1</option>
                    <option value="mistral">Mistral</option>
                    <option value="qwen2.5-coder">Qwen 2.5 Coder</option>
                  </>
                )}
                
                {/* Available models from API */}
                {availableModels.length > 0 && (
                  <>
                    <option disabled>── Available Models ──</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </>
                )}
                
                <option disabled>──────────</option>
                <option value="custom">Custom Model</option>
              </select>
              
              {loadingModels && (
                <div className="flex items-center px-3 text-sm text-gray-500">
                  Loading models...
                </div>
              )}
            </div>
            
            {(localSettings.aiModel === 'custom' || (!['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder'].includes(localSettings.aiModel) && !availableModels.includes(localSettings.aiModel))) && (
              <input
                type="text"
                value={localSettings.aiModel || ''}
                onChange={(e) => {
                  setLocalSettings({ ...localSettings, aiModel: e.target.value });
                }}
                placeholder="Enter model name (e.g., claude-3-opus-20240229)"
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              Select from available models or enter a custom model name
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              variant="secondary"
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            
            <Button
              onClick={() => fetchModels()}
              variant="secondary"
              disabled={loadingModels}
              title="Refresh available models"
            >
              <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-900">
              <Globe className="w-4 h-4 inline mr-1" />
              Works with OpenAI, Ollama, LM Studio, and any OpenAI-compatible API
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700 font-medium mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Supported Environment Variables:
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li><code className="bg-white px-1 rounded">OPENAI_API_KEY</code> - For OpenAI API</li>
              <li><code className="bg-white px-1 rounded">ANTHROPIC_API_KEY</code> - For Claude API</li>
              <li><code className="bg-white px-1 rounded">GOOGLE_API_KEY</code> or <code className="bg-white px-1 rounded">GEMINI_API_KEY</code> - For Google Gemini</li>
              <li><code className="bg-white px-1 rounded">COHERE_API_KEY</code> - For Cohere API</li>
              <li><code className="bg-white px-1 rounded">HUGGINGFACE_API_KEY</code> - For HuggingFace API</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Environment variables are automatically detected and used when the API key field is left blank.
            </p>
          </div>
        </div>
      </Card>

      {/* Update Section */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">App Updates</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Current Version: <span className="font-medium">{currentVersion}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Check for updates to get the latest features and bug fixes
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

        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            Updates are automatically downloaded and you'll be notified when ready to install
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