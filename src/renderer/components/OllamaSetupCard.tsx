import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Cpu,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { useStore } from '../utils/store';
import { logger } from '../utils/logger';
import type { OllamaStatusResult, OllamaPullProgress } from '@shared/types';

/**
 * Guided local-AI setup: probe for Ollama → point at the official download
 * if absent → pull a curated model in-app with live progress → connect.
 * Deliberately never installs anything itself; the user runs the official
 * installer and comes back to "check again".
 */
export function OllamaSetupCard() {
  const { setSettings } = useStore();
  const [status, setStatus] = useState<OllamaStatusResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [pulling, setPulling] = useState<{ model: string; progress?: OllamaPullProgress } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  // Guards the auto-connect so a stray late progress event can't double-fire.
  const completionHandled = useRef(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const result = await window.electronAPI.ollamaStatus();
      setStatus(result);
      if (result.pulling) {
        // A pull started earlier (e.g. before navigating away) is still
        // running — show its progress; events keep streaming to this window.
        setPulling((prev) => prev ?? { model: result.pulling! });
      }
      return result;
    } catch (error) {
      logger.error('Ollama status check failed:', error);
      setStatus({ running: false, models: [], curated: [] });
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Live pull progress from the main process.
  useEffect(() => {
    const unsubscribe = window.electronAPI.onOllamaPullProgress((progress) => {
      setPulling((prev) => (prev && prev.model === progress.model ? { ...prev, progress } : prev));
      // A resumed pull (started before this mount) has no awaiting promise;
      // refresh the model list when it lands so "Use this model" appears.
      if (progress.status === 'success' && !completionHandled.current) {
        checkStatus();
      }
    });
    return unsubscribe;
  }, [checkStatus]);

  const connect = useCallback(
    async (model: string) => {
      setConnecting(model);
      try {
        // Write-through: main persists, returns canonical settings (never the
        // key), and the zustand mirror takes them verbatim. Clearing baseUrl
        // lets the provider default (localhost:11434/v1) apply.
        const saved = await window.electronAPI.setSettings({
          provider: 'ollama',
          aiModel: model,
          baseUrl: '',
        });
        setSettings(saved);
        toast.success(`Connected — Ask InsightLens is now using ${model} locally`);
      } catch (error) {
        toast.error(`Failed to save settings: ${(error as Error).message}`);
      } finally {
        setConnecting(null);
      }
    },
    [setSettings],
  );

  const pull = useCallback(
    async (model: string) => {
      completionHandled.current = false;
      setPulling({ model });
      try {
        const result = await window.electronAPI.ollamaPull(model);
        if (result.success) {
          completionHandled.current = true;
          await checkStatus();
          await connect(model); // the whole point of the journey — finish it
        } else if (result.error !== 'Download cancelled') {
          toast.error(`Download failed: ${result.error}`);
        }
      } catch (error) {
        toast.error(`Download failed: ${(error as Error).message}`);
      } finally {
        setPulling(null);
      }
    },
    [checkStatus, connect],
  );

  const cancelPull = useCallback(() => {
    window.electronAPI.ollamaCancelPull();
  }, []);

  // ── Probing ────────────────────────────────────────────────────────────
  if (checking && !status) {
    return (
      <Card className="p-6 text-left">
        <div className="flex items-center gap-3 text-primary-600 dark:text-primary-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Checking for a local Ollama...</span>
        </div>
      </Card>
    );
  }

  // ── Not running: install / start guidance ─────────────────────────────
  if (!status?.running) {
    return (
      <Card className="p-6 text-left">
        <div className="flex items-start gap-3">
          <Cpu className="w-6 h-6 text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-primary-800 dark:text-primary-100 mb-1">
              Run AI privately on this Mac with Ollama
            </h4>
            <p className="text-sm text-primary-600 dark:text-primary-300 mb-4">
              Ollama is a free app that runs AI models locally — your survey comments never
              leave this computer. It isn't running right now: if it's already installed,
              start it from your Applications folder; otherwise grab it below, run the
              installer, then check again.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => window.electronAPI.openExternal('https://ollama.com/download')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Get Ollama (free)
              </Button>
              <Button
                variant="secondary"
                onClick={checkStatus}
                disabled={checking}
                className="flex items-center gap-2"
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                I've installed it — check again
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── Running: pick / pull a model ───────────────────────────────────────
  const installedExtras = status.models.filter(
    (m) => !status.curated.some((c) => c.id === m),
  );

  return (
    <Card className="p-6 text-left">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-success-500 dark:text-success-300 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-primary-800 dark:text-primary-100 mb-1">
            Ollama is running{status.version ? ` (v${status.version})` : ''}
          </h4>
          <p className="text-sm text-primary-600 dark:text-primary-300 mb-4">
            {status.models.length > 0
              ? 'Pick a model to use — everything stays on this computer.'
              : 'One more step: download a model. Everything stays on this computer.'}
          </p>

          <div className="space-y-2">
            {status.curated.map((model) => {
              const installed = status.models.includes(model.id);
              const isPullingThis = pulling?.model === model.id;
              const percent = isPullingThis ? pulling?.progress?.percent : undefined;
              return (
                <div
                  key={model.id}
                  className="border border-primary-200 dark:border-primary-700 rounded-md p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary-800 dark:text-primary-100">
                          {model.id}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300">
                          {model.label}
                        </span>
                      </div>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                        {model.description}
                      </p>
                    </div>
                    {installed ? (
                      <Button
                        size="sm"
                        onClick={() => connect(model.id)}
                        disabled={connecting !== null}
                        className="flex items-center gap-1.5 flex-shrink-0"
                      >
                        {connecting === model.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Use this model
                      </Button>
                    ) : isPullingThis ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelPull}
                        className="flex items-center gap-1.5 flex-shrink-0"
                        aria-label={`Cancel downloading ${model.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => pull(model.id)}
                        disabled={pulling !== null}
                        className="flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download · {model.sizeGB.toFixed(1)} GB
                      </Button>
                    )}
                  </div>

                  {isPullingThis && (
                    <div className="mt-3">
                      <div
                        className="h-2 rounded bg-primary-100 dark:bg-primary-800 overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent ?? undefined}
                        aria-label={`Downloading ${model.id}`}
                      >
                        <div
                          className="h-full bg-primary-600 dark:bg-primary-400 transition-all duration-300"
                          style={{ width: `${percent ?? 2}%` }}
                        />
                      </div>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                        {percent !== undefined ? `${percent}% — ` : ''}
                        {pulling?.progress?.status ?? 'Starting download...'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {installedExtras.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-primary-500 dark:text-primary-400 mb-1.5">
                Already on this machine:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {installedExtras.slice(0, 6).map((model) => (
                  <button
                    key={model}
                    onClick={() => connect(model)}
                    disabled={connecting !== null}
                    className="text-xs px-2 py-1 rounded border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
                  >
                    Use {model}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
