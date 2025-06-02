import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  Settings as SettingsIcon,
  TrendingUp,
  FileSearch,
  Grid3X3,
  Bot
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Units', href: '/units', icon: Grid3X3 },
    { name: 'Ask InsightLens', href: '/ask', icon: Bot },
    { name: 'Import', href: '/import', icon: Upload },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
            <FileSearch className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">InsightLens</h1>
              <p className="text-xs text-gray-500">Survey Analysis Tool</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Insights */}
          <div className="px-4 py-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Insights
            </h3>
            <div className="space-y-2">
              <Link
                to="/?insight=trending-up"
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-green-600" />
                Trending Up
              </Link>
              <Link
                to="/?insight=need-attention"
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                Need Attention
              </Link>
            </div>
          </div>
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
      </div>
    </div>
  );
}