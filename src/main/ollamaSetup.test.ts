import { describe, it, expect } from 'vitest';
import { parsePullLine, isCuratedModel, CURATED_OLLAMA_MODELS } from './ollamaSetup';

describe('parsePullLine', () => {
  it('parses a layer-progress line into status + percent', () => {
    const line = JSON.stringify({
      status: 'pulling 6a0746a1ec1a',
      digest: 'sha256:6a0746a1ec1a',
      total: 2_000_000,
      completed: 500_000,
    });
    expect(parsePullLine(line)).toEqual({
      status: 'pulling 6a0746a1ec1a',
      total: 2_000_000,
      completed: 500_000,
      percent: 25,
    });
  });

  it('parses a status-only line without inventing a percent', () => {
    expect(parsePullLine('{"status":"verifying sha256 digest"}')).toEqual({
      status: 'verifying sha256 digest',
    });
  });

  it('parses the terminal success line', () => {
    expect(parsePullLine('{"status":"success"}')).toEqual({ status: 'success' });
  });

  it('treats a missing completed count as zero progress', () => {
    const result = parsePullLine('{"status":"pulling x","total":100}');
    expect(result).toEqual({ status: 'pulling x', total: 100, completed: 0, percent: 0 });
  });

  it('caps percent at 100 even if completed overshoots total', () => {
    const result = parsePullLine('{"status":"pulling x","total":100,"completed":150}');
    expect(result?.percent).toBe(100);
  });

  it('returns null for blank, malformed, and error lines', () => {
    expect(parsePullLine('')).toBeNull();
    expect(parsePullLine('   ')).toBeNull();
    expect(parsePullLine('{"status": unterminated')).toBeNull();
    // Ollama error lines have no status field — the IPC layer sniffs them
    // separately; the progress parser must not emit them as progress.
    expect(parsePullLine('{"error":"pull model manifest: file does not exist"}')).toBeNull();
  });
});

describe('isCuratedModel', () => {
  it('accepts every curated model id', () => {
    for (const model of CURATED_OLLAMA_MODELS) {
      expect(isCuratedModel(model.id)).toBe(true);
    }
  });

  it('rejects anything outside the allowlist', () => {
    expect(isCuratedModel('mistral:7b')).toBe(false);
    expect(isCuratedModel('qwen2.5-coder:7b; rm -rf /')).toBe(false);
    expect(isCuratedModel('')).toBe(false);
  });
});

describe('CURATED_OLLAMA_MODELS', () => {
  it('every entry has the fields the setup card renders', () => {
    for (const model of CURATED_OLLAMA_MODELS) {
      expect(model.id).toMatch(/^[\w.-]+:[\w.-]+$/);
      expect(model.label.length).toBeGreaterThan(0);
      expect(model.description.length).toBeGreaterThan(0);
      expect(model.sizeGB).toBeGreaterThan(0);
    }
  });
});
