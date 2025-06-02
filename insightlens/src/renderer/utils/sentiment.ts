// Simple sentiment analysis using AFINN-165 word list
// This provides offline sentiment analysis without requiring an API

const AFINN: { [key: string]: number } = {
  // Positive words
  "love": 3, "loved": 3, "loving": 3, "lovely": 3,
  "excellent": 3, "amazing": 3, "wonderful": 3, "fantastic": 3, "perfect": 3,
  "best": 3, "brilliant": 3, "outstanding": 3, "superb": 3,
  "good": 2, "great": 2, "happy": 2, "awesome": 2, "cool": 2,
  "nice": 2, "better": 2, "beautiful": 2, "useful": 2, "helpful": 2,
  "interesting": 2, "enjoyed": 2, "enjoying": 2, "enjoy": 2, "fun": 2,
  "engaging": 2, "engaged": 2, "valuable": 2, "recommended": 2, "recommend": 2,
  "like": 1, "liked": 1, "okay": 1, "ok": 1, "fine": 1,
  "well": 1, "clear": 1, "easy": 1, "comfortable": 1, "satisfied": 1,
  
  // Negative words
  "hate": -3, "hated": -3, "terrible": -3, "horrible": -3, "awful": -3,
  "worst": -3, "useless": -3, "disgusting": -3, "pathetic": -3,
  "bad": -2, "poor": -2, "boring": -2, "disappointed": -2, "disappointing": -2,
  "difficult": -2, "hard": -2, "confused": -2, "confusing": -2, "frustrating": -2,
  "annoying": -2, "annoyed": -2, "angry": -2, "unhappy": -2, "sad": -2,
  "waste": -2, "wasted": -2, "complicated": -2, "stressful": -2, "stress": -2,
  "dislike": -1, "unclear": -1, "complex": -1, "challenging": -1, "struggle": -1,
  "struggled": -1, "problem": -1, "problems": -1, "issue": -1, "issues": -1,
  
  // Academic context words
  "informative": 2, "educational": 2, "insightful": 2, "practical": 2,
  "relevant": 2, "organized": 2, "structured": 2, "comprehensive": 2,
  "supportive": 2, "encouraging": 2, "motivating": 2, "inspiring": 2,
  "improved": 2, "improvement": 2, "learned": 2, "learning": 1,
  "understand": 1, "understanding": 1, "knowledge": 1, "skills": 1,
  
  "overwhelmed": -2, "overwhelming": -2, "overloaded": -2, "rushed": -2,
  "disorganized": -2, "unprepared": -2, "unavailable": -2, "unresponsive": -2,
  "outdated": -2, "irrelevant": -2, "repetitive": -2, "tedious": -2,
  "vague": -1, "ambiguous": -1, "lacking": -1, "insufficient": -1
};

export interface SentimentResult {
  score: number;
  normalized: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  words: { word: string; score: number }[];
}

export function analyzeSentiment(text: string): SentimentResult {
  // Preprocessing
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // Remove non-alphabetic characters
    .split(/\s+/)
    .filter(word => word.length > 0);

  let totalScore = 0;
  const scoredWords: { word: string; score: number }[] = [];
  let wordCount = 0;

  // Score each word
  for (const word of words) {
    if (AFINN[word] !== undefined) {
      totalScore += AFINN[word];
      scoredWords.push({ word, score: AFINN[word] });
      wordCount++;
    }
  }

  // Calculate normalized score (-1 to 1)
  const normalized = wordCount > 0 ? totalScore / (wordCount * 3) : 0;
  
  // Determine label based on normalized score
  let label: 'positive' | 'neutral' | 'negative';
  if (normalized > 0.1) {
    label = 'positive';
  } else if (normalized < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  // Calculate confidence (0 to 1) based on number of sentiment words found
  const confidence = Math.min(wordCount / words.length, 1);

  return {
    score: totalScore,
    normalized,
    label,
    confidence,
    words: scoredWords
  };
}

// Analyze multiple comments and return aggregate stats
export function analyzeSentimentBatch(comments: string[]): {
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  distribution: SentimentResult[];
} {
  const results = comments.map(comment => analyzeSentiment(comment));
  
  const positive = results.filter(r => r.label === 'positive').length;
  const neutral = results.filter(r => r.label === 'neutral').length;
  const negative = results.filter(r => r.label === 'negative').length;
  
  const averageScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.normalized, 0) / results.length
    : 0;

  return {
    positive,
    neutral,
    negative,
    averageScore,
    distribution: results
  };
}