import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Import } from './pages/Import';
import { Settings } from './pages/Settings';
import { Units } from './pages/Units';
import { UnitDetail } from './pages/UnitDetail';
import { AskInsightLens } from './pages/AskInsightLens';
import { About } from './pages/About';
import { Documentation } from './pages/Documentation';
import { PerformanceReports } from './pages/PerformanceReports';
import { Themes } from './pages/Themes';
import { PromotionSuggestions } from './pages/PromotionSuggestions';
import { UpdateNotification } from './components/UpdateNotification';
import { OnboardingSplash } from './components/OnboardingSplash';
import { useStore } from './utils/store';
import { useApplyTheme } from './hooks/useTheme';
import { logger } from './utils/logger';

function App() {
  const { setSettings, setSettingsLoaded, settings, settingsLoaded } = useStore();
  const [splashDismissed, setSplashDismissed] = useState(false);

  // Resolve the theme preference (light/dark/system) and toggle the
  // 'dark' class on <html>. Settings are loaded into the store below.
  useApplyTheme();

  // Load settings on app start
  useEffect(() => {
    window.electronAPI.getSettings().then(settings => {
      setSettings(settings);
      setSettingsLoaded(true);
    }).catch(error => {
      logger.error('Failed to load settings:', error);
      setSettingsLoaded(true); // Still mark as loaded to prevent infinite loading
    });

    // Listen for menu actions
    window.electronAPI.onMenuAction((action) => {
      if (action === 'import') {
        window.location.href = '#/import';
      } else if (action === 'settings') {
        window.location.href = '#/settings';
      }
    });
  }, [setSettings, setSettingsLoaded]);

  const showSplash = settingsLoaded && settings.showOnboardingOnStartup && !splashDismissed;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<Units />} />
          <Route path="/reports" element={<PerformanceReports />} />
          <Route path="/themes" element={<Themes />} />
          <Route path="/promotion" element={<PromotionSuggestions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/ask" element={<AskInsightLens />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/unit/:unitCode" element={<UnitDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <UpdateNotification />
      {showSplash && <OnboardingSplash onClose={() => setSplashDismissed(true)} />}
    </Router>
  );
}

export default App;
