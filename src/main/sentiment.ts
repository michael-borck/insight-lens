// Simple sentiment analysis for the main process
// Using a basic keyword approach

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'loved',
  'helpful', 'useful', 'interesting', 'engaging', 'enjoy', 'enjoyed', 'best',
  'clear', 'well', 'organized', 'supportive', 'recommended', 'valuable'
];

const NEGATIVE_WORDS = [
  'bad', 'poor', 'terrible', 'horrible', 'awful', 'hate', 'hated', 'boring',
  'difficult', 'hard', 'confused', 'confusing', 'disappointed', 'frustrating',
  'waste', 'useless', 'unclear', 'disorganized', 'unhelpful'
];

export function analyzeSentimentSimple(text: string): { score: number; label: string } {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) {
      positiveCount++;
    } else if (NEGATIVE_WORDS.includes(word)) {
      negativeCount++;
    }
  }
  
  const score = positiveCount - negativeCount;
  let label = 'neutral';
  
  if (score > 0) {
    label = 'positive';
  } else if (score < 0) {
    label = 'negative';
  }
  
  // Normalize score to -1 to 1 range
  const normalizedScore = Math.max(-1, Math.min(1, score / 5));
  
  return { score: normalizedScore, label };
}