import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export function UpdateNotification() {
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    info?: any;
    progress?: any;
    error?: string;
  }>({ status: 'idle' });
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Get current version
    window.electronAPI.getVersion().then(setCurrentVersion);

    // Set up updater event listeners
    window.electronAPI.onUpdaterEvent((event, data) => {
      switch (event) {
        case 'checking-for-update':
          setUpdateState({ status: 'checking' });
          setIsVisible(true);
          break;
        case 'update-available':
          setUpdateState({ status: 'available', info: data });
          setIsVisible(true);
          break;
        case 'update-not-available':
          setUpdateState({ status: 'not-available', info: data });
          setIsVisible(true);
          // Auto-hide after 3 seconds if no update
          setTimeout(() => setIsVisible(false), 3000);
          break;
        case 'download-progress':
          setUpdateState({ status: 'downloading', progress: data });
          setIsVisible(true);
          break;
        case 'update-downloaded':
          setUpdateState({ status: 'downloaded', info: data });
          setIsVisible(true);
          break;
        case 'error':
          setUpdateState({ status: 'error', error: data });
          setIsVisible(true);
          break;
      }
    });

    // Handle menu check for updates
    window.electronAPI.onMenuAction((action) => {
      if (action === 'check-updates') {
        handleCheckForUpdates();
      }
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateState({ status: 'checking' });
    setIsVisible(true);
    
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.error) {
        setUpdateState({ status: 'error', error: result.error });
      }
    } catch (error) {
      setUpdateState({ status: 'error', error: 'Failed to check for updates' });
    }
  };

  const handleInstallUpdate = () => {
    window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const getStatusIcon = () => {
    switch (updateState.status) {
      case 'checking':
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />;
      case 'available':
        return <Download className="w-5 h-5 text-green-600" />;
      case 'downloading':
        return <Download className="w-5 h-5 text-blue-600" />;
      case 'downloaded':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'not-available':
        return <CheckCircle className="w-5 h-5 text-gray-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (updateState.status) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return `Update available: v${updateState.info?.version || 'Unknown'}`;
      case 'downloading':
        return `Downloading update... ${Math.round(updateState.progress?.percent || 0)}%`;
      case 'downloaded':
        return 'Update downloaded and ready to install';
      case 'not-available':
        return 'You have the latest version';
      case 'error':
        return `Update error: ${updateState.error}`;
      default:
        return '';
    }
  };

  const getActionButton = () => {
    switch (updateState.status) {
      case 'available':
        return (
          <Button size="sm" className="ml-4">
            Download Update
          </Button>
        );
      case 'downloaded':
        return (
          <Button size="sm" onClick={handleInstallUpdate} className="ml-4">
            Restart & Install
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="p-4 shadow-lg border-l-4 border-l-primary-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon()}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {getStatusMessage()}
              </p>
              {updateState.status === 'available' && updateState.info?.releaseNotes && (
                <p className="text-xs text-gray-500 mt-1">
                  Current: v{currentVersion}
                </p>
              )}
              {updateState.status === 'downloading' && updateState.progress && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${updateState.progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(updateState.progress.bytesPerSecond / 1024)} KB/s
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center ml-4">
            {getActionButton()}
            <button
              onClick={handleDismiss}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}