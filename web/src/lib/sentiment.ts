// Offline sentiment analysis (AFINN-165 word list). Self-contained port of the
// desktop app's src/renderer/utils/sentiment.ts — the web build intentionally
// has no dependency on the Electron app, so the dictionary is duplicated here.
import type { SentimentResult } from '../types';

const AFINN: Readonly<Record<string, number>> = {
  // Positive
  love: 3, loved: 3, loving: 3, lovely: 3,
  excellent: 3, amazing: 3, wonderful: 3, fantastic: 3, perfect: 3,
  best: 3, brilliant: 3, outstanding: 3, superb: 3,
  good: 2, great: 2, happy: 2, awesome: 2, cool: 2,
  nice: 2, better: 2, beautiful: 2, useful: 2, helpful: 2,
  interesting: 2, enjoyed: 2, enjoying: 2, enjoy: 2, fun: 2,
  engaging: 2, engaged: 2, valuable: 2, recommended: 2, recommend: 2,
  like: 1, liked: 1, okay: 1, ok: 1, fine: 1,
  well: 1, clear: 1, easy: 1, comfortable: 1, satisfied: 1,
  informative: 2, educational: 2, insightful: 2, practical: 2,
  relevant: 2, organized: 2, structured: 2, comprehensive: 2,
  supportive: 2, encouraging: 2, motivating: 2, inspiring: 2,
  improved: 2, improvement: 2, learned: 2, learning: 1,
  understand: 1, understanding: 1, knowledge: 1, skills: 1,
  // Negative
  hate: -3, hated: -3, terrible: -3, horrible: -3, awful: -3,
  worst: -3, useless: -3, disgusting: -3, pathetic: -3,
  bad: -2, poor: -2, boring: -2, disappointed: -2, disappointing: -2,
  difficult: -2, hard: -2, confused: -2, confusing: -2, frustrating: -2,
  annoying: -2, annoyed: -2, angry: -2, unhappy: -2, sad: -2,
  waste: -2, wasted: -2, complicated: -2, stressful: -2, stress: -2,
  dislike: -1, unclear: -1, complex: -1, challenging: -1, struggle: -1,
  struggled: -1, problem: -1, problems: -1, issue: -1, issues: -1,
  overwhelmed: -2, overwhelming: -2, overloaded: -2, rushed: -2,
  disorganized: -2, unprepared: -2, unavailable: -2, unresponsive: -2,
  outdated: -2, irrelevant: -2, repetitive: -2, tedious: -2,
  vague: -1, ambiguous: -1, lacking: -1, insufficient: -1,
};

/** Score one piece of text on a -1..1 normalized scale. */
export function analyzeSentiment(text: string): SentimentResult {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  let totalScore = 0;
  let scored = 0;
  for (const word of words) {
    const v = AFINN[word];
    if (v !== undefined) {
      totalScore += v;
      scored++;
    }
  }

  const normalized = scored > 0 ? totalScore / (scored * 3) : 0;
  const label: SentimentResult['label'] =
    normalized > 0.1 ? 'positive' : normalized < -0.1 ? 'negative' : 'neutral';

  return { score: totalScore, normalized, label };
}

export interface SentimentBatch {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  average: SentimentResult; // aggregate over all comments
}

/** Aggregate sentiment across many comments. */
export function analyzeSentimentBatch(comments: string[]): SentimentBatch {
  const results = comments.map(analyzeSentiment);
  const positive = results.filter((r) => r.label === 'positive').length;
  const negative = results.filter((r) => r.label === 'negative').length;
  const neutral = results.length - positive - negative;
  const avgNorm = results.length > 0
    ? results.reduce((sum, r) => sum + r.normalized, 0) / results.length
    : 0;
  const label: SentimentResult['label'] =
    avgNorm > 0.1 ? 'positive' : avgNorm < -0.1 ? 'negative' : 'neutral';
  return {
    total: results.length,
    positive,
    neutral,
    negative,
    average: { score: 0, normalized: avgNorm, label },
  };
}
