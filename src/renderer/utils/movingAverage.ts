// A small centred moving-average helper used by UnitTimelineChart for its
// optional trend line. Pure function (no Recharts coupling) so it can be
// tested in isolation.
//
// Why centred + edge-shrinking (not lagging, not NaN-padded):
//   • Lagging averages distort the visual position of the trend relative
//     to the underlying data — the line drifts right of the points.
//   • NaN-padded edges leave the trend line hanging in mid-air at both
//     ends of the chart, which reads as missing data.
// Shrinking the window at the edges (using whatever neighbours are
// available) gives a continuous line from first point to last and lines
// up visually with the scatter.
//
// For window=3 and a series of length 5, the windows are:
//   [0]: y0, y1                    (2 values — left edge)
//   [1]: y0, y1, y2                (3 values — full window)
//   [2]: y1, y2, y3                (3 values — full window)
//   [3]: y2, y3, y4                (3 values — full window)
//   [4]:        y3, y4             (2 values — right edge)

export interface XYPoint {
  x: number;
  y: number;
}

/**
 * Centred moving average over points sorted by x. Returns a point per
 * input point. Window is the *target* span; at the edges it shrinks to
 * whatever neighbours are within radius. Window must be a positive
 * integer; non-positive or non-finite y values are skipped (not counted
 * in the window) but their slot in the output preserves the original x.
 *
 * Defensive: an empty input returns an empty output. A single-point
 * input returns that point unchanged. NaN/Infinity y values are skipped
 * within each window (so one bad reading doesn't poison its neighbours);
 * if every value in a window is non-finite, that point is omitted from
 * the output.
 */
export function movingAverage(points: XYPoint[], window: number = 3): XYPoint[] {
  if (!Number.isInteger(window) || window < 1) {
    throw new Error(`movingAverage: window must be a positive integer, got ${window}`);
  }
  if (points.length === 0) return [];
  if (points.length === 1) {
    return Number.isFinite(points[0].y) ? [points[0]] : [];
  }

  const radius = Math.floor(window / 2);
  const out: XYPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(points.length - 1, i + radius);
    let sum = 0;
    let n = 0;
    for (let j = lo; j <= hi; j++) {
      const y = points[j].y;
      if (Number.isFinite(y)) {
        sum += y;
        n += 1;
      }
    }
    if (n > 0) {
      out.push({ x: points[i].x, y: sum / n });
    }
  }
  return out;
}
