import { useEffect, useState, type CSSProperties } from 'react';
import {
  detectPlatform, matchAsset, useLatestRelease,
  PLATFORM_LABELS, type Platform,
} from '../lib/releases';
import './LandingPage.css';

interface Props {
  onTry: () => void;
}

const FEATURES = [
  { icon: '◎', title: 'Survey extraction', desc: 'Drop in an eVALUate-style PDF and InsightLens pulls the unit, responses, agreement scores, benchmarks, and comments — automatically.', tone: 'accent' },
  { icon: '▤', title: 'Clear visualizations', desc: 'Agreement bars against benchmark, trend lines across offerings, and sentiment over comments — the signal, not the noise.', tone: 'amber' },
  { icon: '✎', title: 'Sentiment analysis', desc: 'Every student comment scored offline, so you see at a glance whether the written feedback confirms the numbers.', tone: 'accent' },
  { icon: '◈', title: 'Evidence-based recommendations', desc: 'Each weak dimension comes with a concrete, teaching-focused action — grounded in your own survey data.', tone: 'amber' },
  { icon: '⌂', title: 'Private by default', desc: 'Everything runs on your machine. Your survey data never leaves your computer — and the web try runs in your browser too.', tone: 'accent' },
  { icon: '⛓', title: 'Trends across offerings', desc: 'Track a unit semester over semester and spot what is improving or slipping before it becomes a problem.', tone: 'amber' },
];

const PLATFORMS: Platform[] = ['mac', 'windows', 'linux'];

// ─── Hero animated survey mock ─────────────────────────────────────────────
// Decorative only (aria-hidden). Cycles through survey dimensions as if
// analysing them live, mirroring the real app: agreement bars vs benchmark,
// a live health score, and a sentiment tally.

interface MockDim { key: string; label: string; value: number; benchmark: number; }

const MOCK_DIMS: MockDim[] = [
  { key: 'engagement', label: 'Engaging activities', value: 88.2, benchmark: 84.1 },
  { key: 'resources', label: 'Helpful resources', value: 90.1, benchmark: 85.3 },
  { key: 'support', label: 'Supported learning', value: 79.4, benchmark: 86.0 },
  { key: 'assessments', label: 'Clear assessments', value: 82.0, benchmark: 83.5 },
  { key: 'expectations', label: 'Clear expectations', value: 86.5, benchmark: 84.2 },
  { key: 'overall', label: 'Worthwhile experience', value: 85.0, benchmark: 84.8 },
];

const MOCK_STEP_MS = 760;

function SurveyMock() {
  const [revealed, setRevealed] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((n) => (n >= MOCK_DIMS.length ? n : n + 1));
    }, MOCK_STEP_MS);
    return () => clearInterval(id);
  }, [cycle]);

  useEffect(() => {
    if (revealed !== MOCK_DIMS.length) return;
    const id = setTimeout(() => setCycle((c) => c + 1), 4800);
    return () => clearTimeout(id);
  }, [revealed]);

  const shown = MOCK_DIMS.slice(0, revealed);
  const score = shown.length
    ? Math.round(shown.reduce((s, d) => s + d.value, 0) / shown.length)
    : 0;
  const below = shown.filter((d) => d.value < d.benchmark).length;
  const ringStyle = { '--p': `${score}%` } as CSSProperties;

  return (
    <div className="survey-mock" aria-hidden="true">
      <div className="survey-mock-head">
        <span className="survey-mock-unit">MATH1014 — Foundation Mathematics</span>
        <span className={`survey-mock-live ${revealed < MOCK_DIMS.length ? 'is-active' : ''}`}>
          <i className="live-dot" /> {revealed < MOCK_DIMS.length ? 'Analysing' : 'Complete'}
        </span>
      </div>

      <div className="survey-mock-score">
        <div className="score-ring" style={ringStyle}>
          <span className="score-val">{score}</span>
          <span className="score-lbl">health</span>
        </div>
        <div className="score-meta">
          <span className="score-pill score-pill--below">{below} below benchmark</span>
          <span className="score-pill score-pill--sent">☺ 14 positive · ☹ 3 negative</span>
        </div>
      </div>

      <ul className="survey-mock-rows">
        {MOCK_DIMS.map((d, i) => {
          const checked = i < revealed;
          return (
            <li key={d.key} className={`mock-dim ${checked ? 'is-done' : 'is-pending'}`}>
              <div className="mock-dim-top">
                <span className="mock-dim-label">{d.label}</span>
                <span className={`mock-dim-val ${checked && d.value < d.benchmark ? 'is-below' : ''}`}>
                  {checked ? `${d.value.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="mock-dim-track">
                <div className="mock-dim-bench" style={{ left: `${d.benchmark}%` }} title={`benchmark ${d.benchmark}%`} />
                <div
                  className={`mock-dim-fill ${checked && d.value < d.benchmark ? 'is-below' : ''}`}
                  style={{ width: checked ? `${d.value}%` : '0%' }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Landing page ──────────────────────────────────────────────────────────
export function LandingPage({ onTry }: Props) {
  const [selected, setSelected] = useState<Platform>(detectPlatform);
  const { release, loading } = useLatestRelease();

  const asset = release ? matchAsset(release.assets, selected) : null;
  const downloadUrl = asset?.url ?? 'https://github.com/michael-borck/insight-lens/releases/latest';
  const label = `Download for ${PLATFORM_LABELS[selected]}`;

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-text">
            <span className="hero-pill"><span className="hero-pill-dot" /> Unit survey analysis for lecturers</span>
            <h1 className="hero-heading">
              Turn survey noise into <em>clear insight</em>
            </h1>
            <p className="hero-sub">
              Drop in a unit-survey PDF and InsightLens extracts the scores, benchmarks the
              results, and gives you evidence-based recommendations — privately, in seconds.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={onTry}>Try it online — no install</button>
              <a className="btn btn-secondary" href={downloadUrl}>{label}</a>
            </div>
            <p className="hero-note">
              <span className="hero-note-strong">Privacy-first:</span> the web tool runs entirely in your browser. No upload, no sign-up.
            </p>
          </div>
          <div className="hero-mock">
            <SurveyMock />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="wrap">
          <h2 className="section-heading">How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Drop in your survey PDF</h3>
                <p>One eVALUate-style unit report. InsightLens reads the unit, responses, agreement percentages, benchmarks and comments.</p>
              </div>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>See the signal</h3>
                <p>Agreement bars against benchmark, an overall health score, and comment sentiment — the story behind the numbers.</p>
              </div>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Act on recommendations</h3>
                <p>Each weak dimension gets a concrete, teaching-focused action you can take next offering.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="wrap">
          <h2 className="section-heading">What you get</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className={`feature-card feature-card--${f.tone}`}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section className="download-section">
        <div className="wrap download-inner">
          <h2 className="section-heading">Get the desktop app</h2>
          <p className="download-sub">
            Everything the web version offers, plus the features that make it a daily tool.
          </p>

          <div className="comparison">
            <div className="comparison-col">
              <h3 className="comparison-heading">In the web try</h3>
              <ul className="comparison-list">
                <li><span className="check">✓</span> One survey, analysed instantly</li>
                <li><span className="check">✓</span> Agreement vs benchmark</li>
                <li><span className="check">✓</span> Comment sentiment</li>
                <li><span className="check">✓</span> Evidence-based recommendations</li>
              </ul>
            </div>
            <div className="comparison-col comparison-col--desktop">
              <h3 className="comparison-heading">Desktop only</h3>
              <ul className="comparison-list">
                <li><span className="star">★</span> Many surveys in a private database</li>
                <li><span className="star">★</span> Trends across offerings &amp; units</li>
                <li><span className="star">★</span> AI insights (BYO API key)</li>
                <li><span className="star">★</span> Promotion-suggestion reports</li>
                <li><span className="star">★</span> Export to PDF &amp; CSV</li>
              </ul>
            </div>
          </div>

          <div className="download-cta">
            <a className="btn btn-primary download-btn" href={downloadUrl}>
              {loading ? 'Finding latest release…' : label}
            </a>
            <div className="platform-selector">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  className={`platform-option ${p === selected ? 'platform-option--active' : ''}`}
                  onClick={() => setSelected(p)}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {release?.version && <p className="download-version">Latest release: {release.version}</p>}
            <p className="download-fine">Free &amp; open source · MIT licensed</p>
          </div>
        </div>
      </section>
    </div>
  );
}
