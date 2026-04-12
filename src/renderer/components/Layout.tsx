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
  BookOpen,
  BarChart3,
  Award
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
    { name: 'Promotion Suggestions', href: '/promotion', icon: Award },
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
    <div className="flex h-screen bg-primary-50">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-primary-800 shadow-sm border-r border-primary-900 transition-all duration-300`}>
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-primary-900`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <FileSearch className="w-8 h-8 text-primary-300 flex-shrink-0" />
                <div>
                  <h1 className="text-xl font-semibold font-serif text-primary-100">InsightLens</h1>
                  <p className="text-xs text-primary-300">Survey Analysis Tool</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-primary-500 hover:text-primary-100 hover:bg-primary-900 rounded transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Quick Insights */}
          {!isCollapsed && (
            <div className="px-4 py-4 border-b border-primary-900">
              <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">
                Quick Insights
              </h3>
              <div className="space-y-2">
                <Link
                  to="/?insight=trending-up"
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-primary-500 hover:bg-primary-900 hover:text-primary-100 rounded-md transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-success-500" />
                  Trending Up
                </Link>
                <Link
                  to="/?insight=need-attention"
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-primary-500 hover:bg-primary-900 hover:text-primary-100 rounded-md transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-error-500 rotate-180" />
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
                      ? 'bg-primary-900/50 text-primary-100'
                      : 'text-primary-500 hover:bg-primary-900 hover:text-primary-100'
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.name === 'Ask InsightLens' && settings.apiUrl && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            aiStatus === 'connected' ? 'bg-success-500' :
                            aiStatus === 'disconnected' ? 'bg-error-500' :
                            'bg-warning-500 animate-pulse'
                          }`}
                          title={aiStatus === 'connected' ? 'AI connected' : aiStatus === 'disconnected' ? 'AI not connected' : 'Checking...'}
                        />
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* App Info */}
          {!isCollapsed && (
            <div className="px-4 py-4 border-t border-primary-900">
              <Link
                to="/about"
                className="flex items-center gap-3 px-3 py-2 text-xs text-primary-500 hover:text-primary-300 hover:bg-primary-900 rounded-md transition-colors"
              >
                <FileSearch className="w-4 h-4" />
                <div>
                  <div className="font-medium">InsightLens</div>
                  <div className="text-primary-600">v{currentVersion}</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with draggable region for Electron */}
        <div className="bg-primary-50 border-b border-primary-200 drag-region">
          <div className="px-6 py-3 platform-darwin window-controls-space">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium font-serif text-primary-800 no-drag">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-primary-50">
          {location.pathname === '/ask' ? (
            <div className="h-full px-2 py-2">
              {children}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-6 py-6">
              {children}
            </div>
          )}
        </main>

        {/* Minimal footer - only shown for context, no dev links */}
      </div>
    </div>
  );
}