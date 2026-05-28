import { describe, it, expect } from 'vitest';
import {
  getEra,
  eraLabel,
  eraLabelForYear,
  PANDEMIC_START_YEAR,
  POST_PANDEMIC_START_YEAR,
} from './era';

describe('getEra', () => {
  it('classifies years before pandemic as pre-pandemic', () => {
    expect(getEra(2019)).toBe('pre-pandemic');
    expect(getEra(2010)).toBe('pre-pandemic');
    expect(getEra(2007)).toBe('pre-pandemic'); // earliest eValuate year in the corpus
  });

  it('classifies pandemic years 2020-2021 as pandemic', () => {
    expect(getEra(2020)).toBe('pandemic');
    expect(getEra(2021)).toBe('pandemic');
  });

  it('classifies years from 2022 onwards as post-pandemic', () => {
    expect(getEra(2022)).toBe('post-pandemic');
    expect(getEra(2024)).toBe('post-pandemic');
    expect(getEra(2030)).toBe('post-pandemic');
  });

  it('boundary years follow the documented constants', () => {
    // Pin the boundaries — if these constants move, both these assertions
    // need updating + the team should think about historical data interpretation.
    expect(getEra(PANDEMIC_START_YEAR - 1)).toBe('pre-pandemic');
    expect(getEra(PANDEMIC_START_YEAR)).toBe('pandemic');
    expect(getEra(POST_PANDEMIC_START_YEAR - 1)).toBe('pandemic');
    expect(getEra(POST_PANDEMIC_START_YEAR)).toBe('post-pandemic');
  });
});

describe('eraLabel + eraLabelForYear', () => {
  it('returns the title-cased label for each era', () => {
    expect(eraLabel('pre-pandemic')).toBe('Pre-pandemic');
    expect(eraLabel('pandemic')).toBe('Pandemic');
    expect(eraLabel('post-pandemic')).toBe('Post-pandemic');
  });

  it('combines year-to-era + label in one call', () => {
    expect(eraLabelForYear(2019)).toBe('Pre-pandemic');
    expect(eraLabelForYear(2020)).toBe('Pandemic');
    expect(eraLabelForYear(2023)).toBe('Post-pandemic');
  });
});
