import { useCallback, useEffect, useRef, useState } from 'react';
import { extractSurvey } from '../lib/pdfExtract';
import { analyzeSurvey } from '../lib/analyze';
import { fetchAiAvailable, fetchAiRecommendations } from '../lib/api';
import type {
  AiRecommendation, AiRecommendationResponse, AnalysisResult, RecommendationRequest,
} from '../types';
import './ToolPage.css';

interface Props {
  onHome: () => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'working'; fileName: string }
  | { kind: 'done'; result: AnalysisResult }
  | { kind: 'error'; message: string };

const SEVERITY_META = {
  critical: { label: 'Address', cls: 'sev--critical' },
  watch: { label: 'Watch', cls: 'sev--watch' },
  strength: { label: 'Strength', cls: 'sev--strength' },
} as const;

const PRIORITY_META: Record<string, string> = { high: 'ai-pri--high', medium: 'ai-pri--med', low: 'ai-pri--low' };

export function ToolPage({ onHome }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setState({ kind: 'working', fileName: file.name });
    const extracted = await extractSurvey(file);
    if (!extracted.success || !extracted.data) {
      setState({ kind: 'error', message: extracted.error ?? 'Could not read that PDF.' });
      return;
    }
    const data = extracted.data;
    const hasScores = Object.values(data.percentage_agreement).some((v) => typeof v === 'number');
    if (!data.unit_info.unit_code && !hasScores && data.comments.length === 0) {
      setState({
        kind: 'error',
        message: 'This PDF does not look like an eVALUate-style unit survey report. InsightLens expects a Curtin unit survey PDF with agreement percentages and comments.',
      });
      return;
    }
    setState({ kind: 'done', result: analyzeSurvey(data) });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => setState({ kind: 'idle' });

  return (
    <div className="tool wrap">
      <div className="tool-head">
        <button className="tool-back" onClick={onHome}>← Back to home</button>
        <h1 className="tool-title">Try InsightLens online</h1>
        <p className="tool-lede">
          Analyse one unit-survey PDF right here. Your file is processed in your browser and never uploaded.
        </p>
      </div>

      {state.kind === 'idle' && (
        <div
          className={`dropzone ${dragging ? 'dropzone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="dropzone-input"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="dropzone-icon" aria-hidden="true">⬆</div>
          <h2 className="dropzone-title">Drop a unit survey PDF here</h2>
          <p className="dropzone-sub">or click to choose a file · eVALUate-style report · max one survey</p>
          <p className="dropzone-private">🔒 Stays on your device — nothing is uploaded.</p>
        </div>
      )}

      {state.kind === 'working' && (
        <div className="tool-working">
          <div className="spinner" aria-hidden="true" />
          <p>Reading <strong>{state.fileName}</strong>…</p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="tool-error">
          <h2>Could not analyse that file</h2>
          <p>{state.message}</p>
          <div className="tool-error-actions">
            <button className="btn btn-primary" onClick={reset}>Try another file</button>
            <button className="btn btn-secondary" onClick={onHome}>Back to home</button>
          </div>
        </div>
      )}

      {state.kind === 'done' && <Results result={state.result} onReset={reset} />}
    </div>
  );
}

function toRequest(result: AnalysisResult): RecommendationRequest {
  const d = result.data;
  return {
    unit: {
      code: d.unit_info.unit_code, name: d.unit_info.unit_name,
      term: d.unit_info.term, year: d.unit_info.year,
      campus: d.unit_info.campus_name, mode: d.unit_info.mode,
    },
    responses: {
      enrolments: d.response_stats.enrollments, responses: d.response_stats.responses,
      responseRate: d.response_stats.response_rate,
    },
    dimensions: result.questionResults.map((q) => ({ label: q.label, value: q.value, benchmark: q.benchmark })),
    sentiment: {
      total: result.sentimentCounts.total, positive: result.sentimentCounts.positive,
      neutral: result.sentimentCounts.neutral, negative: result.sentimentCounts.negative,
      average: result.sentiment.normalized,
    },
    comments: d.comments,
  };
}

// ─── Results ──────────────────────────────────────────────────────────────
function Results({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { data, healthScore, questionResults, recommendations, sentiment } = result;
  const ui = data.unit_info;
  const rs = data.response_stats;
  const heading = [ui.unit_code, ui.unit_name].filter(Boolean).join(' — ') || 'Unit survey';
  const context = [ui.term, ui.year, ui.campus_name, ui.mode].filter(Boolean).join(' · ');

  return (
    <div className="results animate-in">
      <div className="results-bar">
        <div className="results-id">
          <h2 className="results-heading">{heading}</h2>
          {context && <p className="results-context">{context}</p>}
        </div>
        <button className="btn btn-secondary" onClick={onReset}>Analyse another</button>
      </div>

      <div className="results-overview">
        <ScoreCard score={healthScore} sentiment={sentiment.normalized} comments={data.comments.length} responseRate={rs.response_rate} responses={rs.responses} enrolments={rs.enrollments} />
      </div>

      <section className="results-section">
        <h3 className="results-section-title">Agreement vs benchmark</h3>
        <ul className="dim-list">
          {questionResults.map((q) => {
            const v = q.value;
            const bm = q.benchmark;
            const hasVal = typeof v === 'number';
            const hasBm = typeof bm === 'number';
            const below = hasVal && hasBm && v < bm;
            return (
              <li key={q.key} className="dim-row">
                <div className="dim-row-top">
                  <span className="dim-row-label">{q.label}</span>
                  <span className={`dim-row-val ${below ? 'is-below' : ''}`}>
                    {hasVal ? `${v.toFixed(1)}%` : '—'}
                    {hasBm && <span className="dim-row-bench"> · bench {bm.toFixed(1)}%</span>}
                  </span>
                </div>
                <div className="dim-row-track">
                  {hasBm && <div className="dim-row-benchmark" style={{ left: `${bm}%` }} title={`benchmark ${bm}%`} />}
                  <div className={`dim-row-fill ${below ? 'is-below' : ''}`} style={{ width: hasVal ? `${v}%` : '0%' }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="results-section">
        <h3 className="results-section-title">Recommendations</h3>
        <ul className="rec-list">
          {recommendations.map((r, i) => {
            const meta = SEVERITY_META[r.severity];
            return (
              <li key={i} className={`rec-card ${meta.cls}`}>
                <span className={`rec-sev ${meta.cls}`}>{meta.label}</span>
                <div className="rec-body">
                  <h4 className="rec-title">{r.title}</h4>
                  <p className="rec-detail">{r.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <AiPanel result={result} />

      {data.comments.length > 0 && (
        <section className="results-section">
          <h3 className="results-section-title">Student comments <span className="results-section-count">({data.comments.length})</span></h3>
          <ul className="comment-list">
            {data.comments.slice(0, 12).map((c, i) => (
              <li key={i} className="comment-item">{c}</li>
            ))}
          </ul>
          {data.comments.length > 12 && <p className="comment-more">+ {data.comments.length - 12} more in the desktop app</p>}
        </section>
      )}

      <div className="results-upsell">
        <div>
          <h3 className="upsell-title">Want the full picture?</h3>
          <p className="upsell-text">The desktop app tracks many surveys, shows trends across offerings, and adds AI insights — all private on your machine.</p>
        </div>
        <a className="btn btn-primary" href="https://github.com/michael-borck/insight-lens/releases/latest">Download the desktop app</a>
      </div>
    </div>
  );
}

// ─── AI panel (opt-in; only shown when the server has AI configured) ──────
type AiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; data: AiRecommendationResponse }
  | { kind: 'error'; message: string };

function AiPanel({ result }: { result: AnalysisResult }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [aiState, setAiState] = useState<AiState>({ kind: 'idle' });

  useEffect(() => { fetchAiAvailable().then(setAvailable); }, []);

  const ask = async () => {
    setAiState({ kind: 'loading' });
    const res = await fetchAiRecommendations(toRequest(result));
    if (res.ok) setAiState({ kind: 'done', data: res.data });
    else setAiState({ kind: 'error', message: res.error });
  };

  if (available === false) return null;

  if (aiState.kind === 'done') {
    return <AiResults data={aiState.data} />;
  }

  const busy = aiState.kind === 'loading' || available === null;
  return (
    <section className="results-section ai-section">
      <h3 className="results-section-title">AI recommendations</h3>
      <p className="ai-blurb">Ask the server's AI model for deeper, consultant-style recommendations grounded in this survey.</p>
      <p className="ai-private">Sends the extracted scores and comments to the server for analysis. Your PDF is not uploaded.</p>
      {aiState.kind === 'error' && <p className="ai-error">{aiState.message}</p>}
      <button className="btn btn-primary ai-ask" disabled={busy} onClick={ask}>
        {aiState.kind === 'loading' ? 'Asking AI…' : available === null ? 'Checking availability…' : 'Ask AI for recommendations'}
      </button>
    </section>
  );
}

function AiResults({ data }: { data: AiRecommendationResponse }) {
  if (data.recommendations.length === 0) {
    return (
      <section className="results-section ai-section">
        <h3 className="results-section-title">AI recommendations</h3>
        <p className="ai-blurb">The AI did not return any recommendations for this survey.</p>
      </section>
    );
  }
  return (
    <section className="results-section ai-section">
      <h3 className="results-section-title">AI recommendations <span className="results-section-count">({data.recommendations.length})</span></h3>
      {data.summary && <p className="ai-summary">{data.summary}</p>}
      <ul className="ai-list">
        {data.recommendations.map((r, i) => <AiRec key={i} rec={r} />)}
      </ul>
    </section>
  );
}

function AiRec({ rec }: { rec: AiRecommendation }) {
  const priCls = rec.priority ? PRIORITY_META[rec.priority] ?? '' : '';
  return (
    <li className="ai-rec">
      <div className="ai-rec-head">
        <h4 className="ai-rec-title">{rec.title}</h4>
        {rec.priority && <span className={`ai-pri ${priCls}`}>{rec.priority}</span>}
        {rec.category && <span className="ai-cat">{rec.category}</span>}
      </div>
      {rec.description && <p className="ai-rec-desc">{rec.description}</p>}
      {rec.evidence && rec.evidence.length > 0 && (
        <div className="ai-rec-block"><span className="ai-rec-lbl">Evidence</span><ul>{rec.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
      )}
      {rec.actionSteps && rec.actionSteps.length > 0 && (
        <div className="ai-rec-block"><span className="ai-rec-lbl">Action steps</span><ul>{rec.actionSteps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {rec.impact && <p className="ai-rec-impact"><span className="ai-rec-lbl">Impact: </span>{rec.impact}</p>}
    </li>
  );
}

function ScoreCard(props: { score: number; sentiment: number; comments: number; responseRate?: number; responses?: number; enrolments?: number }) {
  const tone = props.score >= 85 ? 'good' : props.score >= 75 ? 'ok' : 'low';
  const sentLabel = props.sentiment > 0.1 ? 'Positive' : props.sentiment < -0.1 ? 'Negative' : 'Neutral';
  return (
    <div className={`score-card score-card--${tone}`}>
      <div className="score-card-main">
        <span className="score-card-num">{props.score}</span>
        <span className="score-card-of">/ 100</span>
        <span className="score-card-lbl">overall health</span>
      </div>
      <dl className="score-card-stats">
        <div><dt>Sentiment</dt><dd>{props.comments > 0 ? `${sentLabel} (${props.sentiment.toFixed(2)})` : '—'}</dd></div>
        {typeof props.responseRate === 'number' && <div><dt>Response rate</dt><dd>{props.responseRate.toFixed(1)}%</dd></div>}
        {typeof props.responses === 'number' && typeof props.enrolments === 'number' && <div><dt>Responses</dt><dd>{props.responses} / {props.enrolments}</dd></div>}
      </dl>
    </div>
  );
}
