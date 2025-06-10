import React, { useEffect } from 'react';
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
import { useStore } from './utils/store';

function App() {
  const { setSettings, setSettingsLoaded } = useStore();

  // Load settings on app start
  useEffect(() => {
    window.electronAPI.getSettings().then(settings => {
      setSettings(settings);
      setSettingsLoaded(true);
    }).catch(error => {
      console.error('Failed to load settings:', error);
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

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<Units />} />
          <Route path="/import" element={<Import />} />
          <Route path="/ask" element={<AskInsightLens />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/unit/:unitCode" element={<UnitDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;