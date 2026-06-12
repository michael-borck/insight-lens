// Pure pin-list logic for "pin AI charts to the Dashboard", kept free of
// Electron imports so it is unit-testable. The IPC layer (src/main/ipc/charts.ts)
// owns persistence (electron-store) and SQL execution; this module owns
// validation, ordering, the pin cap, and the SQL-stripped list view.
import type { AiChartSpec, PinnedChartMeta } from '../shared/types';

export const MAX_PINS = 8;

// The full stored shape — includes the spec's SQL, so it must never be sent
// to the renderer as-is. Use toListView() for anything crossing IPC.
export interface PinnedChart {
  id: string;
  question: string;
  spec: AiChartSpec;
  createdAt: string;
}

/**
 * Minimal validation of a spec received from the renderer (which in turn got
 * it from an 'ai:askInsightLens' response). Returns an error message the UI
 * can toast, or null when the spec is pinnable.
 */
export function validatePinSpec(spec: unknown): string | null {
  const s = spec as Partial<AiChartSpec> | null | undefined;
  if (!s || typeof s !== 'object') return 'Invalid chart spec.';
  if (typeof s.chartType !== 'string') return 'Invalid chart spec: missing chart type.';
  if (typeof s.data?.sql !== 'string') return 'Invalid chart spec: missing query.';
  // Summary-style responses carry an empty sql — there is nothing to
  // re-execute later, so they cannot be pinned.
  if (s.data.sql.trim() === '') {
    return 'This response has no underlying query to refresh, so it cannot be pinned.';
  }
  return null;
}

export type AddPinResult =
  | { ok: true; list: PinnedChart[] }
  | { ok: false; error: string };

/** Newest pin first; rejects (rather than evicts) once the cap is reached. */
export function addPin(list: PinnedChart[], pin: PinnedChart): AddPinResult {
  if (list.length >= MAX_PINS) {
    return { ok: false, error: `Pin limit reached (${MAX_PINS}). Unpin a chart first.` };
  }
  return { ok: true, list: [pin, ...list] };
}

export function removePin(list: PinnedChart[], id: string): PinnedChart[] {
  return list.filter((pin) => pin.id !== id);
}

/**
 * The renderer-facing view of the pin list: identical metadata, but with
 * data.sql stripped so the stored SQL text never reaches the renderer.
 */
export function toListView(list: PinnedChart[]): PinnedChartMeta[] {
  return list.map(({ id, question, createdAt, spec }) => ({
    id,
    question,
    createdAt,
    spec: {
      chartType: spec.chartType,
      title: spec.title,
      data: {
        xAxis: spec.data?.xAxis,
        yAxis: spec.data?.yAxis,
        series: spec.data?.series,
        groupBy: spec.data?.groupBy,
      },
      insights: spec.insights,
    },
  }));
}
