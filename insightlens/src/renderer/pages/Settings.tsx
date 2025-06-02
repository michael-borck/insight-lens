import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Key, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useStore } from '../utils/store';

export function Settings() {
  const { settings, setSettings: updateStore } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      await window.electronAPI.setSettings(localSettings);
      updateStore(localSettings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
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
      const headers: HeadersInit = {};
      if (localSettings.apiKey) {
        headers['Authorization'] = `Bearer ${localSettings.apiKey}`;
      }
      
      // First try a simple GET to the base URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const baseResponse = await fetch(localSettings.apiUrl, {
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (baseResponse.ok || baseResponse.status === 404) {
          // Base URL is reachable, now try /models endpoint
          try {
            const modelsResponse = await fetch(localSettings.apiUrl + '/models', {
              headers
            });
            
            if (modelsResponse.ok) {
              const data = await modelsResponse.json();
              toast.success('Connection successful!');
              
              // Extract model names from the response
              if (data.data && Array.isArray(data.data)) {
                const models = data.data.map((model: any) => model.id).filter(Boolean);
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
                setAvailableModels(models);
              }
            } else {
              // Models endpoint failed but base URL works
              toast.success('Connection successful! (Models list unavailable)');
            }
          } catch (modelsError) {
            // Models endpoint failed but base URL works
            toast.success('Connection successful! (Models list unavailable)');
          }
        } else {
          toast.error(`Connection failed: HTTP ${baseResponse.status}`);
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          toast.error('Connection timeout. Check if the service is running.');
        } else {
          toast.error('Connection failed. Check your URL.');
        }
      }
    } catch (error) {
      toast.error('Connection failed. Check your settings.');
    } finally {
      setTesting(false);
    }
  };

  const fetchModels = async () => {
    if (!localSettings.apiUrl) return;
    
    setLoadingModels(true);
    try {
      const headers: HeadersInit = {};
      if (localSettings.apiKey) {
        headers['Authorization'] = `Bearer ${localSettings.apiKey}`;
      }
      
      const response = await fetch(localSettings.apiUrl + '/models', {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const models = data.data.map((model: any) => model.id).filter(Boolean);
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
          setAvailableModels(models);
          
          if (localSettings.aiModel && !models.includes(localSettings.aiModel)) {
            setAvailableModels([...models, localSettings.aiModel]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch models when API settings change
  useEffect(() => {
    if (localSettings.apiUrl) {
      fetchModels();
    }
  }, [localSettings.apiKey, localSettings.apiUrl]);

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
              value={localSettings.apiUrl === 'https://api.openai.com/v1' || localSettings.apiUrl === 'http://localhost:11434/v1' ? localSettings.apiUrl : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomUrl(localSettings.apiUrl);
                }
                setLocalSettings({ ...localSettings, apiUrl: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="https://api.openai.com/v1">OpenAI</option>
              <option value="http://localhost:11434/v1">Ollama (Local)</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>

          {(localSettings.apiUrl !== 'https://api.openai.com/v1' && localSettings.apiUrl !== 'http://localhost:11434/v1') && (
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
              API Key {(localSettings.apiUrl !== 'https://api.openai.com/v1' && localSettings.apiUrl !== 'http://localhost:11434/v1') && <span className="text-gray-500 font-normal">(Optional)</span>}
            </label>
            <input
              type="password"
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={localSettings.apiUrl === 'https://api.openai.com/v1' ? 'sk-...' : 'Enter API key if required'}
            />
            <p className="mt-1 text-xs text-gray-500">
              {(localSettings.apiUrl !== 'https://api.openai.com/v1' && localSettings.apiUrl !== 'http://localhost:11434/v1') 
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
                  ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder'].includes(localSettings.aiModel) || 
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
            
            {(localSettings.aiModel === 'custom' || (!['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder'].includes(localSettings.aiModel) && !availableModels.includes(localSettings.aiModel))) && (
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
            
            {availableModels.length > 0 && (
              <Button
                onClick={() => fetchModels()}
                variant="secondary"
                disabled={loadingModels}
                title="Refresh available models"
              >
                <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-900">
            <Globe className="w-4 h-4 inline mr-1" />
            Works with OpenAI, Ollama, LM Studio, and any OpenAI-compatible API
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