import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  Settings as SettingsIcon,
  TrendingUp,
  FileSearch,
  Grid3X3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  BookOpen,
  Github,
  Twitter,
  BarChart3
} from 'lucide-react';
import { useStore } from '../utils/store';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const { settings } = useStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Units', href: '/units', icon: Grid3X3 },
    { name: 'Performance Reports', href: '/reports', icon: BarChart3 },
    { name: 'Ask InsightLens', href: '/ask', icon: Bot },
    { name: 'Import', href: '/import', icon: Upload },
    { name: 'Documentation', href: '/docs', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  // Get current version
  useEffect(() => {
    window.electronAPI.getVersion().then(setCurrentVersion).catch(() => {
      setCurrentVersion('1.0.0'); // fallback
    });
  }, []);

  // Check AI connection status
  useEffect(() => {
    const checkAiStatus = async () => {
      if (!settings.apiUrl) {
        setAiStatus('disconnected');
        return;
      }

      try {
        // Ensure proper URL format for connection test
        let testUrl = settings.apiUrl;
        if (!testUrl.endsWith('/v1') && !testUrl.includes('anthropic.com')) {
          testUrl += '/v1';
        }
        if (!testUrl.endsWith('/v1') && testUrl.includes('anthropic.com')) {
          testUrl += '/v1';
        }
        
        const result = await window.electronAPI.testConnection(testUrl, settings.apiKey);
        setAiStatus(result.success ? 'connected' : 'disconnected');
      } catch (error) {
        setAiStatus('disconnected');
      }
    };

    checkAiStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkAiStatus, 30000);
    return () => clearInterval(interval);
  }, [settings.apiUrl, settings.apiKey]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-800 shadow-sm border-r border-gray-700 transition-all duration-300`}>
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-gray-700`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <FileSearch className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div>
                  <h1 className="text-xl font-semibold text-white">InsightLens</h1>
                  <p className="text-xs text-gray-400">Survey Analysis Tool</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Quick Insights */}
          {!isCollapsed && (
            <div className="px-4 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Insights
              </h3>
              <div className="space-y-2">
                <Link
                  to="/?insight=trending-up"
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Trending Up
                </Link>
                <Link
                  to="/?insight=need-attention"
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                  Need Attention
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* App Info */}
          {!isCollapsed && (
            <div className="px-4 py-4 border-t border-gray-700">
              <Link
                to="/about"
                className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
              >
                <FileSearch className="w-4 h-4" />
                <div>
                  <div className="font-medium">InsightLens</div>
                  <div className="text-gray-500">v{currentVersion}</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with draggable region for Electron */}
        <div className="bg-white border-b border-gray-200 drag-region">
          <div className="px-6 py-3 platform-darwin window-controls-space">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 no-drag">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500">
                InsightLens v{currentVersion}
              </div>
              
              {/* Social Links */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.electronAPI.openExternal('https://github.com/YOUR_GITHUB_USERNAME/insight-lens')}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  title="View source on GitHub"
                >
                  <Github className="w-3 h-3" />
                  <span>GitHub</span>
                </button>
                
                <button
                  onClick={() => window.electronAPI.openExternal('https://x.com/Michael_Borck')}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  title="Follow @Michael_Borck on X"
                >
                  <Twitter className="w-3 h-3" />
                  <span>@Michael_Borck</span>
                </button>
              </div>
            </div>
            
            {/* AI Status */}
            {settings.apiUrl && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {aiStatus === 'connected' ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">AI Connected</span>
                    </>
                  ) : aiStatus === 'disconnected' ? (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">AI Disconnected</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                      <span className="text-xs text-yellow-600">Checking...</span>
                    </>
                  )}
                </div>
                {settings.aiModel && (
                  <span className="text-xs text-gray-400">
                    ({settings.aiModel})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}