// Era derivation — maps a year to one of three pandemic-era buckets so the
// UI can show pre/during/post context on charts, timelines, and AskInsightLens
// answers. Pure derivation from a single integer; no schema dependency.
//
// At Curtin, COVID-era teaching shifted online in Semester 1 2020 (March
// 2020 lockdown), stayed hybrid through 2021, and most face-to-face teaching
// returned in 2022. The boundaries below reflect that timeline:
//
//   year < 2020             → 'pre-pandemic'
//   year ∈ {2020, 2021}     → 'pandemic'
//   year >= 2022            → 'post-pandemic'
//
// These are interpretation labels for *when* a survey happened, NOT a
// statement about *what mode* it was delivered in. Delivery mode lives on
// unit_offering.mode ('Internal' | 'Online' | 'Aggregated'). Many 2020-2021
// units stayed Internal; many 2022+ units stayed Online. Era and mode are
// orthogonal axes.

export type Era = 'pre-pandemic' | 'pandemic' | 'post-pandemic';

/** First year considered pandemic-era at Curtin. */
export const PANDEMIC_START_YEAR = 2020;
/** First year considered post-pandemic at Curtin (most face-to-face returned). */
export const POST_PANDEMIC_START_YEAR = 2022;

/** Bucket a year into one of three eras. */
export function getEra(year: number): Era {
  if (year < PANDEMIC_START_YEAR) return 'pre-pandemic';
  if (year < POST_PANDEMIC_START_YEAR) return 'pandemic';
  return 'post-pandemic';
}

/** Title-cased human label for an era. */
export function eraLabel(era: Era): string {
  switch (era) {
    case 'pre-pandemic':
      return 'Pre-pandemic';
    case 'pandemic':
      return 'Pandemic';
    case 'post-pandemic':
      return 'Post-pandemic';
  }
}

/** Convenience: year → human label in one call. */
export function eraLabelForYear(year: number): string {
  return eraLabel(getEra(year));
}
