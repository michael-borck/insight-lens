import { describe, it, expect } from 'vitest';
import { addPin, removePin, toListView, validatePinSpec, MAX_PINS, PinnedChart } from './pinnedCharts';
import type { AiChartSpec } from '../shared/types';

function makeSpec(overrides: Partial<AiChartSpec> = {}): AiChartSpec {
  return {
    chartType: 'bar',
    title: 'Satisfaction by discipline',
    data: {
      sql: 'SELECT discipline_name, AVG(overall_experience) AS avg_exp FROM unit_survey GROUP BY 1',
      xAxis: 'discipline_name',
      yAxis: 'avg_exp',
    },
    insights: 'Some insight',
    ...overrides,
  };
}

function makePin(id: string, spec: AiChartSpec = makeSpec()): PinnedChart {
  return { id, question: `question ${id}`, spec, createdAt: new Date().toISOString() };
}

describe('validatePinSpec', () => {
  it('accepts a line/bar/table spec with SQL', () => {
    expect(validatePinSpec(makeSpec())).toBeNull();
  });

  it('rejects null / non-object specs', () => {
    expect(validatePinSpec(null)).toMatch(/invalid/i);
    expect(validatePinSpec('bar')).toMatch(/invalid/i);
  });

  it('rejects a spec without chartType', () => {
    const spec: any = makeSpec();
    delete spec.chartType;
    expect(validatePinSpec(spec)).toMatch(/chart type/i);
  });

  it('rejects a spec without a sql string', () => {
    const spec: any = makeSpec();
    delete spec.data.sql;
    expect(validatePinSpec(spec)).toMatch(/query/i);
  });

  it('rejects summary specs with an empty sql (nothing to re-execute)', () => {
    const spec = makeSpec({ chartType: 'summary', data: { sql: '', xAxis: '', yAxis: '' } });
    expect(validatePinSpec(spec)).toMatch(/cannot be pinned/i);
  });
});

describe('addPin', () => {
  it('unshifts the new pin so the newest is first', () => {
    let list: PinnedChart[] = [];
    for (const id of ['a', 'b', 'c']) {
      const result = addPin(list, makePin(id));
      expect(result.ok).toBe(true);
      if (result.ok) list = result.list;
    }
    expect(list.map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input list', () => {
    const original = [makePin('a')];
    addPin(original, makePin('b'));
    expect(original.map((p) => p.id)).toEqual(['a']);
  });

  it(`rejects the ${MAX_PINS + 1}th pin with a toastable error`, () => {
    let list: PinnedChart[] = [];
    for (let i = 0; i < MAX_PINS; i++) {
      const result = addPin(list, makePin(`pin-${i}`));
      expect(result.ok).toBe(true);
      if (result.ok) list = result.list;
    }
    expect(list).toHaveLength(MAX_PINS);

    const overflow = addPin(list, makePin('one-too-many'));
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.error).toBe('Pin limit reached (8). Unpin a chart first.');
    }
    // The original list is unchanged on rejection.
    expect(list).toHaveLength(MAX_PINS);
  });
});

describe('removePin', () => {
  it('removes only the matching id', () => {
    const list = [makePin('a'), makePin('b'), makePin('c')];
    expect(removePin(list, 'b').map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('is a no-op for an unknown id', () => {
    const list = [makePin('a')];
    expect(removePin(list, 'nope')).toHaveLength(1);
  });
});

describe('toListView', () => {
  it('strips data.sql so SQL text never reaches the renderer', () => {
    const view = toListView([makePin('a')]);
    expect(view).toHaveLength(1);
    expect(view[0].spec.data).not.toHaveProperty('sql');
    expect(JSON.stringify(view)).not.toContain('SELECT');
  });

  it('keeps id, question, createdAt and the renderable spec fields', () => {
    const pin = makePin('a');
    const [view] = toListView([pin]);
    expect(view.id).toBe('a');
    expect(view.question).toBe('question a');
    expect(view.createdAt).toBe(pin.createdAt);
    expect(view.spec.chartType).toBe('bar');
    expect(view.spec.title).toBe('Satisfaction by discipline');
    expect(view.spec.data.xAxis).toBe('discipline_name');
    expect(view.spec.data.yAxis).toBe('avg_exp');
    expect(view.spec.insights).toBe('Some insight');
  });

  it('preserves list order', () => {
    const view = toListView([makePin('newest'), makePin('older')]);
    expect(view.map((v) => v.id)).toEqual(['newest', 'older']);
  });
});
