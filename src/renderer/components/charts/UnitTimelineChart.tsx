// Unit-detail timeline chart — Phase 4.
//
// One scatter chart per unit, showing every survey result for a selected
// question over time. The chart encodes three orthogonal axes of information
// in the marks themselves so the surrounding UI doesn't need filter
// checkboxes for each:
//
//   • X: year + semester offset (S1 = year, S2 = year + 0.5) so adjacent
//     semesters within a year are visible but distinct.
//   • Y: percent agreement (0–100).
//   • Colour + shape: delivery mode (Internal blue ●, Online orange ●,
//     Aggregated grey ▼). Aggregated is the eValuate placeholder mode for
//     reports that combine across delivery modes; the distinct shape doubles
//     as an instrument tag.
//
// Era (pre / pandemic / post) is drawn as a faint background band — it's
// derivable from year, so a filter would be redundant. The pandemic band
// only renders if it overlaps the data window.
//
// An optional 3-period centred moving average can be toggled on by the
// page (off by default — sparse semestral data with mode-switches doesn't
// always have a meaningful trend).
//
// First Recharts component in insight-lens. The explicit-dim wrapper div
// + width/height="100%" + debounce on ResponsiveContainer follows the
// same pattern that fixed the Windows blank-charts bug in document-lens.

import React from 'react';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import {
  PANDEMIC_START_YEAR,
  POST_PANDEMIC_START_YEAR,
} from '../../../main/era';
import { movingAverage } from '../../utils/movingAverage';

// One survey result row as returned by the unitTimelineSeries query.
export interface TimelinePoint {
  year: number;
  semester: string;
  location: string;
  mode: 'Internal' | 'Online' | 'Aggregated';
  question_short: string;
  percent_agree: number;
  responses: number;
  enrolments: number;
  pdf_file_name: string | null;
}

interface UnitTimelineChartProps {
  /** Chronologically-ordered points for the unit's selected question(s). */
  points: TimelinePoint[];
  /** Human label for the question being plotted (used in tooltip + Y-axis). */
  questionLabel: string;
  /** Whether to overlay the 3-period moving-average trend line. */
  showTrend: boolean;
}

const MODE_STYLE: Record<TimelinePoint['mode'], { fill: string; shape: 'circle' | 'triangle' }> = {
  Internal: { fill: '#2563eb', shape: 'circle' },   // blue
  Online: { fill: '#ea580c', shape: 'circle' },     // orange
  Aggregated: { fill: '#64748b', shape: 'triangle' }, // slate — eValuate aggregate
};

/** Map (year, semester) → continuous x value. S2 is offset 0.5 from S1. */
function toX(p: TimelinePoint): number {
  // Curtin's semesters are "Semester 1" / "Semester 2"; trimesters and
  // open-universities terms appear occasionally in eValuate corpus. Fall
  // back to 0 for unrecognised so they cluster at year-start rather than
  // breaking the chart.
  const m = p.semester.match(/(\d+)/);
  const ord = m ? parseInt(m[1], 10) - 1 : 0;
  return p.year + ord * 0.5;
}

interface InternalPoint {
  x: number;
  y: number;
  raw: TimelinePoint;
}

function toInternal(points: TimelinePoint[]): InternalPoint[] {
  return points.map((raw) => ({ x: toX(raw), y: raw.percent_agree, raw }));
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  // Recharts wraps the original datum in payload[0].payload.raw — we set
  // raw above so the tooltip can show all the human-readable fields.
  const raw = (payload[0].payload as InternalPoint | undefined)?.raw;
  if (!raw) return null;
  return (
    <div className="rounded-md border border-primary-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-primary-800">
        {raw.semester} {raw.year}
      </div>
      <div className="text-primary-600">
        {raw.mode} · {raw.location}
      </div>
      <div className="mt-1 font-semibold text-primary-800">
        {raw.percent_agree.toFixed(1)}%
      </div>
      <div className="text-primary-600">
        {raw.responses} / {raw.enrolments} responses
      </div>
    </div>
  );
}

export function UnitTimelineChart({ points, questionLabel, showTrend }: UnitTimelineChartProps) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-primary-50 rounded-lg border-2 border-dashed border-primary-200">
        <div className="text-center">
          <div className="text-primary-500 mb-2">📊</div>
          <h3 className="text-lg font-medium text-primary-800 font-serif mb-1">
            No Data Available
          </h3>
          <p className="text-sm text-primary-600">
            No survey results for this question yet
          </p>
        </div>
      </div>
    );
  }

  const internal = toInternal(points);

  // Split by mode for one Scatter series each (Recharts colours per series).
  const byMode = {
    Internal: internal.filter((p) => p.raw.mode === 'Internal'),
    Online: internal.filter((p) => p.raw.mode === 'Online'),
    Aggregated: internal.filter((p) => p.raw.mode === 'Aggregated'),
  };

  // X-axis bounds — half a unit of breathing room either side.
  const xValues = internal.map((p) => p.x);
  const xMin = Math.floor(Math.min(...xValues)) - 0.5;
  const xMax = Math.ceil(Math.max(...xValues)) + 0.5;

  // Integer-year ticks across the data window.
  const ticks: number[] = [];
  for (let y = Math.ceil(xMin); y <= Math.floor(xMax); y++) ticks.push(y);

  // Pandemic band, clipped to the data window. Only renders if it overlaps.
  const bandStart = Math.max(xMin, PANDEMIC_START_YEAR);
  const bandEnd = Math.min(xMax, POST_PANDEMIC_START_YEAR);
  const showPandemicBand = bandEnd > bandStart;

  // Optional moving-average trend line — computed from ALL points
  // chronologically, ignoring mode. The line shows the unit's overall
  // trajectory; mode-comparison is what the scatter colour is for.
  const trend = showTrend ? movingAverage(internal.map(({ x, y }) => ({ x, y })), 3) : [];

  return (
    // Explicit-dim wrapper + min-width: 0 are the safe pattern for Recharts
    // inside flex/grid parents — without them ResponsiveContainer can
    // measure 0 width on first render on some platforms.
    <div style={{ width: '100%', height: 300, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {showPandemicBand && (
            <ReferenceArea
              x1={bandStart}
              x2={bandEnd}
              fill="#f59e0b"
              fillOpacity={0.08}
              ifOverflow="visible"
              label={{
                value: 'Pandemic',
                position: 'insideTop',
                fill: '#92400e',
                fontSize: 11,
              }}
            />
          )}

          <XAxis
            type="number"
            dataKey="x"
            domain={[xMin, xMax]}
            ticks={ticks}
            tickFormatter={(v) => String(Math.round(v))}
            allowDecimals={false}
            stroke="#475569"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="#475569"
            label={{
              value: questionLabel,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#475569', fontSize: 12 },
            }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />

          {byMode.Internal.length > 0 && (
            <Scatter
              name="Internal"
              data={byMode.Internal}
              fill={MODE_STYLE.Internal.fill}
              shape={MODE_STYLE.Internal.shape}
            />
          )}
          {byMode.Online.length > 0 && (
            <Scatter
              name="Online"
              data={byMode.Online}
              fill={MODE_STYLE.Online.fill}
              shape={MODE_STYLE.Online.shape}
            />
          )}
          {byMode.Aggregated.length > 0 && (
            <Scatter
              name="Aggregated (eValuate)"
              data={byMode.Aggregated}
              fill={MODE_STYLE.Aggregated.fill}
              shape={MODE_STYLE.Aggregated.shape}
            />
          )}

          {showTrend && trend.length > 1 && (
            <Line
              name="Trend (3-period MA)"
              data={trend}
              dataKey="y"
              type="monotone"
              stroke="#0f172a"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              legendType="plainline"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
