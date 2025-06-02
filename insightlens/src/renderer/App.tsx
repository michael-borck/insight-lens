import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Import } from './pages/Import';
import { Settings } from './pages/Settings';
import { Units } from './pages/Units';
import { UnitDetail } from './pages/UnitDetail';
import { AskInsightLens } from './pages/AskInsightLens';
import { useStore } from './utils/store';

function App() {
  const { setSettings } = useStore();

  // Load settings on app start
  useEffect(() => {
    window.electronAPI.getSettings().then(settings => {
      setSettings(settings);
    });

    // Listen for menu actions
    window.electronAPI.onMenuAction((action) => {
      if (action === 'import') {
        window.location.href = '#/import';
      } else if (action === 'settings') {
        window.location.href = '#/settings';
      }
    });
  }, [setSettings]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<Units />} />
          <Route path="/import" element={<Import />} />
          <Route path="/ask" element={<AskInsightLens />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/unit/:unitCode" element={<UnitDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;