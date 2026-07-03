// InsightLens web server. Serves the built frontend and a thin AI API.
// The frontend and API share one origin (no CORS), and the API key lives only
// here in process.env (read from .env via docker-compose env_file, never sent
// to the browser).

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { complete, parseJsonResponse } from './ai/client';
import { buildRecommendationRequest, getModelCapabilities } from './ai/prompt';
import { isRecommendationPayload, loadAiConfig } from './config';
import { AiError } from './ai/types';

const PORT = Number(process.env.PORT ?? 8080);
const DIST_DIR = process.env.DIST_DIR ?? join(process.cwd(), 'dist');

const { config: aiConfig, status: aiStatus } = loadAiConfig();
if (aiStatus.configured) {
  console.log(`[ai] configured: ${aiStatus.provider}/${aiStatus.model}`);
} else {
  console.warn(`[ai] not configured — ${aiStatus.reason ?? 'unknown reason'}. AI recommendations disabled.`);
}

const api = new Hono();

api.get('/health', (c) => c.json({ ok: true, ai: aiStatus }));

api.post('/recommend', async (c) => {
  if (!aiConfig) {
    return c.json({ success: false, error: aiStatus.reason ?? 'AI is not configured on the server' }, 503);
  }
  const raw = await c.req.json().catch(() => null);
  if (!isRecommendationPayload(raw)) {
    return c.json({ success: false, error: 'Invalid request payload' }, 400);
  }
  try {
    const req = buildRecommendationRequest(raw, getModelCapabilities(aiConfig.model, aiConfig.baseUrl ?? ''));
    const text = await complete(req, aiConfig);
    const parsed = parseJsonResponse<{ recommendations: unknown[]; summary?: string }>(text);
    return c.json({ success: true, data: parsed });
  } catch (err) {
    const message = err instanceof AiError ? err.message : 'AI request failed';
    const httpStatus = err instanceof AiError && err.status ? err.status : 502;
    return c.json({ success: false, error: message }, httpStatus as 400);
  }
});

const app = new Hono();
app.route('/api', api);

// Static frontend assets (vite build output), then SPA fallback to index.html.
app.use('/*', serveStatic({ root: DIST_DIR }));

let indexHtml: string | null = null;
function getIndex(): string {
  if (indexHtml === null) indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
  return indexHtml;
}
app.get('/*', (c) => c.html(getIndex()));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`InsightLens web listening on http://0.0.0.0:${info.port}`);
});
