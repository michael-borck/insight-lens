import React, { useState, useEffect, useRef } from 'react';
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
  Award,
  MessagesSquare
} from 'lucide-react';
import { useStore } from '../utils/store';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  // The user's last manual collapse preference while the window was wide.
  // When the window narrows below 900px we auto-collapse; when it widens
  // again we restore this. A manual toggle while narrow still works, but
  // it's a temporary override that lasts until the next threshold crossing.
  const manualPreferenceRef = useRef(false);
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const { settings } = useStore();

  const navigationSections = [
    {
      label: 'Analyze',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Units', href: '/units', icon: Grid3X3 },
        { name: 'Performance Reports', href: '/reports', icon: BarChart3 },
        { name: 'Comment Themes', href: '/themes', icon: MessagesSquare },
      ],
    },
    {
      label: 'Tools',
      items: [
        { name: 'Promotion Suggestions', href: '/promotion', icon: Award },
        { name: 'Ask InsightLens', href: '/ask', icon: Bot },
      ],
    },
    {
      label: 'App',
      items: [
        { name: 'Import', href: '/import', icon: Upload },
        { name: 'Documentation', href: '/docs', icon: BookOpen },
        { name: 'Settings', href: '/settings', icon: SettingsIcon },
      ],
    },
  ];

  // Flat list, used for the top-bar page title lookup.
  const navigation = navigationSections.flatMap((section) => section.items);

  // Auto-collapse the sidebar when the window gets narrow, restore the
  // user's manual preference when it widens again.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 900px)');
    const apply = (isWide: boolean) => {
      setIsCollapsed(isWide ? manualPreferenceRef.current : true);
    };
    apply(mql.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      // Only record the preference when the window is wide; a toggle while
      // narrow is a temporary override, not a lasting choice.
      if (window.matchMedia('(min-width: 900px)').matches) {
        manualPreferenceRef.current = next;
      }
      return next;
    });
  };

  // Get current version
  useEffect(() => {
    window.electronAPI.getVersion().then(setCurrentVersion).catch(() => {
      setCurrentVersion('1.0.0'); // fallback
    });
  }, []);

  // Check AI connection status
  useEffect(() => {
    const checkAiStatus = async () => {
      if (!settings.aiModel) {
        setAiStatus('disconnected');
        return;
      }

      try {
        // The main process resolves the key (stored or env); the renderer passes none.
        const result = await window.electronAPI.testConnection(settings.provider, settings.baseUrl, '');
        setAiStatus(result.success ? 'connected' : 'disconnected');
      } catch (error) {
        setAiStatus('disconnected');
      }
    };

    checkAiStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkAiStatus, 30000);
    return () => clearInterval(interval);
  }, [settings.provider, settings.baseUrl, settings.aiModel]);

  return (
    <div className="flex h-screen bg-primary-50 dark:bg-primary-950">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-primary-800 shadow-sm border-r border-primary-900 transition-all duration-300`}>
        <div className="flex flex-col h-full">
          {/* Logo and Collapse Button */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-primary-900 drag-region ${isMac ? 'platform-darwin-sidebar-offset' : ''}`}>
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
              onClick={toggleCollapsed}
              className="p-1 text-primary-500 hover:text-primary-100 hover:bg-primary-900 rounded transition-colors no-drag"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Quick Insights */}
          <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-4 border-b border-primary-900`}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">
                Quick Insights
              </h3>
            )}
            <div className="space-y-2">
              <Link
                to="/?insight=trending-up"
                title={isCollapsed ? 'Trending Up' : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full px-3 py-2 text-left text-sm font-medium text-primary-300 hover:bg-primary-700 hover:text-success-500 rounded-md transition-colors`}
              >
                <TrendingUp className="w-4 h-4 text-success-500 flex-shrink-0" />
                {!isCollapsed && 'Trending Up'}
              </Link>
              <Link
                to="/?insight=need-attention"
                title={isCollapsed ? 'Need Attention' : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full px-3 py-2 text-left text-sm font-medium text-primary-300 hover:bg-primary-700 hover:text-warning-500 rounded-md transition-colors`}
              >
                <TrendingUp className="w-4 h-4 text-warning-500 rotate-180 flex-shrink-0" />
                {!isCollapsed && 'Need Attention'}
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.label}>
                {isCollapsed ? (
                  sectionIndex > 0 && <div className="my-2 mx-2 border-t border-primary-900" />
                ) : (
                  <h3 className={`px-3 ${sectionIndex > 0 ? 'pt-4' : ''} pb-1 text-xs font-semibold text-primary-500 uppercase tracking-wider`}>
                    {section.label}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const aiStatusLabel =
                      aiStatus === 'connected' ? 'AI connected' :
                      aiStatus === 'disconnected' ? 'AI not connected' :
                      'Checking AI connection...';
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
                            {item.name === 'Ask InsightLens' && settings.aiModel && (
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  aiStatus === 'connected' ? 'bg-success-500' :
                                  aiStatus === 'disconnected' ? 'bg-error-500' :
                                  'bg-warning-500 animate-pulse'
                                }`}
                                title={aiStatusLabel}
                              >
                                <span className="sr-only">{aiStatusLabel}</span>
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
        <div className="bg-primary-50 dark:bg-primary-950 border-b border-primary-200 dark:border-primary-800 drag-region">
          <div className="px-6 py-3 platform-darwin window-controls-space">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100 no-drag">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-primary-50 dark:bg-primary-950">
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