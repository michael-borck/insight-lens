import { describe, it, expect } from 'vitest';
import { movingAverage } from './movingAverage';

describe('movingAverage', () => {
  it('returns [] for empty input', () => {
    expect(movingAverage([])).toEqual([]);
  });

  it('returns the single point unchanged when only one is given', () => {
    expect(movingAverage([{ x: 2019, y: 80 }])).toEqual([{ x: 2019, y: 80 }]);
  });

  it('window=3, length=5: edge points use shrunk windows, middle uses full', () => {
    // y = [10, 20, 30, 40, 50] → centred 3-MA expected:
    //   [0]: avg(10,20)       = 15
    //   [1]: avg(10,20,30)    = 20
    //   [2]: avg(20,30,40)    = 30
    //   [3]: avg(30,40,50)    = 40
    //   [4]: avg(40,50)       = 45
    const input = [10, 20, 30, 40, 50].map((y, i) => ({ x: i, y }));
    const got = movingAverage(input, 3);
    expect(got.map((p) => p.y)).toEqual([15, 20, 30, 40, 45]);
    // x positions are preserved so the trend line lines up with the points.
    expect(got.map((p) => p.x)).toEqual([0, 1, 2, 3, 4]);
  });

  it('window=5 with 3 points reduces to the full-series average at every point', () => {
    // Radius = 2 means each point's window covers the entire 3-point series.
    const got = movingAverage(
      [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 30 },
      ],
      5,
    );
    expect(got.map((p) => p.y)).toEqual([20, 20, 20]);
  });

  it('skips non-finite y values inside a window (one bad reading does not poison the trend)', () => {
    // The NaN in the middle should be ignored — neighbours still average normally.
    const got = movingAverage(
      [
        { x: 0, y: 10 },
        { x: 1, y: NaN },
        { x: 2, y: 30 },
      ],
      3,
    );
    // [0]: avg(10) [NaN skipped]            = 10
    // [1]: avg(10, 30) [NaN at i=1 skipped] = 20
    // [2]: avg(30) [NaN skipped]            = 30
    expect(got.map((p) => p.y)).toEqual([10, 20, 30]);
  });

  it('rejects non-positive or non-integer windows', () => {
    expect(() => movingAverage([{ x: 0, y: 1 }], 0)).toThrow(/window/i);
    expect(() => movingAverage([{ x: 0, y: 1 }], -1)).toThrow(/window/i);
    expect(() => movingAverage([{ x: 0, y: 1 }], 1.5)).toThrow(/window/i);
  });
});
