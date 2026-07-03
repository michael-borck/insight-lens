import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { ToolPage } from './pages/ToolPage';
import './App.css';

declare const __APP_VERSION__: string;

type Page = 'landing' | 'tool';

export function App() {
  const [page, setPage] = useState<Page>('landing');

  return (
    <div className="app">
      <header className="app-header">
        <div className="wrap app-header-inner">
          <button className="brand" onClick={() => setPage('landing')} aria-label="InsightLens home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="34" height="34">
                <circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" strokeWidth="4" />
                <circle cx="32" cy="32" r="6.5" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-name">InsightLens</span>
          </button>
          <nav className="app-nav">
            <button className={`nav-link ${page === 'landing' ? 'active' : ''}`} onClick={() => setPage('landing')}>Home</button>
            <button className={`nav-link ${page === 'tool' ? 'active' : ''}`} onClick={() => setPage('tool')}>Try it online</button>
            <a className="nav-link nav-link--ext" href="https://github.com/michael-borck/insight-lens" target="_blank" rel="noreferrer">GitHub ↗</a>
            <span className="version">v{__APP_VERSION__}</span>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {page === 'landing' ? (
          <LandingPage onTry={() => setPage('tool')} />
        ) : (
          <ToolPage onHome={() => setPage('landing')} />
        )}
      </main>

      <footer className="app-footer">
        <div className="wrap app-footer-inner">
          <p>InsightLens — unit survey analysis for lecturers.</p>
          <p className="footer-meta">
            Open source · MIT · <a href="https://github.com/michael-borck/insight-lens" target="_blank" rel="noreferrer">michael-borck/insight-lens</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
