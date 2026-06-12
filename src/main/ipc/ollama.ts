// Guided Ollama setup: probe the local daemon, pull a curated model with
// streamed progress, all from the main process (the renderer makes no
// network calls, and Ollama's CORS wouldn't admit an Electron origin anyway).
//
// Deliberately NOT an installer: we never touch the system service. The
// renderer's setup card sends the user to ollama.com for the install step
// and re-probes when they come back.
import { ipcMain } from 'electron';
import log from 'electron-log';
import fetch from 'node-fetch';
import {
  OLLAMA_API_BASE,
  CURATED_OLLAMA_MODELS,
  isCuratedModel,
  parsePullLine,
} from '../ollamaSetup';

// One pull at a time; cancellable from the renderer.
let activePull: { model: string; controller: AbortController } | null = null;

async function probeJson(url: string, timeoutMs: number): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function registerOllamaHandlers() {
  // Is a local Ollama running, and which models does it have?
  ipcMain.handle('ollama:status', async () => {
    const version = await probeJson(`${OLLAMA_API_BASE}/api/version`, 1500);
    if (!version) {
      return { running: false, models: [], curated: CURATED_OLLAMA_MODELS };
    }
    const tags = await probeJson(`${OLLAMA_API_BASE}/api/tags`, 3000);
    const models: string[] = (tags?.models ?? [])
      .map((m: any) => m?.name)
      .filter((n: any) => typeof n === 'string');
    return {
      running: true,
      version: typeof version.version === 'string' ? version.version : undefined,
      models,
      curated: CURATED_OLLAMA_MODELS,
      pulling: activePull?.model,
    };
  });

  // Pull a curated model, streaming NDJSON progress back as
  // 'ollama-pull-progress' events on the requesting window.
  ipcMain.handle('ollama:pull', async (event, model: string) => {
    if (!isCuratedModel(model)) {
      return { success: false, error: `Model "${model}" is not in the supported list.` };
    }
    if (activePull) {
      return { success: false, error: `Already downloading ${activePull.model}.` };
    }

    const controller = new AbortController();
    activePull = { model, controller };
    log.info(`[ollama] Pulling ${model}`);

    try {
      const res = await fetch(`${OLLAMA_API_BASE}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        return { success: false, error: `Ollama returned ${res.status} ${res.statusText}` };
      }

      // node-fetch v2 bodies are Node streams; NDJSON lines can split
      // across chunks, so buffer up to each newline.
      let buffered = '';
      let lastError: string | null = null;
      for await (const chunk of res.body as NodeJS.ReadableStream & AsyncIterable<Buffer>) {
        buffered += chunk.toString();
        const lines = buffered.split('\n');
        buffered = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          // Ollama reports failures as {"error":"..."} lines (no status
          // field), which parsePullLine drops — sniff them separately.
          try {
            const raw = JSON.parse(line);
            if (typeof raw?.error === 'string') lastError = raw.error;
          } catch {
            /* not JSON — ignore */
          }
          const progress = parsePullLine(line);
          if (progress && !event.sender.isDestroyed()) {
            event.sender.send('ollama-pull-progress', { model, ...progress });
          }
        }
      }
      const tail = parsePullLine(buffered);
      if (tail && !event.sender.isDestroyed()) {
        event.sender.send('ollama-pull-progress', { model, ...tail });
      }

      if (lastError) {
        log.error(`[ollama] Pull of ${model} failed: ${lastError}`);
        return { success: false, error: lastError };
      }
      log.info(`[ollama] Pulled ${model}`);
      return { success: true };
    } catch (error) {
      if (controller.signal.aborted) {
        log.info(`[ollama] Pull of ${model} cancelled`);
        return { success: false, error: 'Download cancelled' };
      }
      log.error(`[ollama] Pull of ${model} failed:`, error);
      return { success: false, error: (error as Error).message };
    } finally {
      activePull = null;
    }
  });

  ipcMain.handle('ollama:cancelPull', async () => {
    activePull?.controller.abort();
    return { success: true };
  });
}
