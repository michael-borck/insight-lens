import React from 'react';
import { Smile, Meh, Frown } from 'lucide-react';
import { analyzeSentiment } from '../utils/sentiment';

interface CommentWithSentimentProps {
  comment: string;
  semester?: string;
  year?: string;
  showDetails?: boolean;
}

export function CommentWithSentiment({ 
  comment, 
  semester, 
  year,
  showDetails = false 
}: CommentWithSentimentProps) {
  const sentiment = analyzeSentiment(comment);
  
  const sentimentIcon = {
    positive: <Smile className="w-5 h-5 text-success-500" />,
    neutral: <Meh className="w-5 h-5 text-primary-500" />,
    negative: <Frown className="w-5 h-5 text-error-500" />
  }[sentiment.label];

  const sentimentColor = {
    positive: 'border-success-500',
    neutral: 'border-primary-300',
    negative: 'border-error-500'
  }[sentiment.label];

  const bgColor = {
    positive: 'bg-success-50',
    neutral: 'bg-primary-50',
    negative: 'bg-error-50'
  }[sentiment.label];

  return (
    <div className={`p-4 rounded-lg border-l-4 ${sentimentColor} ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {sentimentIcon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-primary-700">{comment}</p>
          
          {showDetails && sentiment.words.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sentiment.words.map((word, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded ${
                    word.score > 0
                      ? 'bg-success-50 text-success-500'
                      : 'bg-error-50 text-error-500'
                  }`}
                >
                  {word.word} ({word.score > 0 ? '+' : ''}{word.score})
                </span>
              ))}
            </div>
          )}
          
          <div className="mt-2 flex items-center gap-4 text-xs text-primary-600">
            {semester && year && (
              <span>{semester} {year}</span>
            )}
            <span className="capitalize">{sentiment.label}</span>
            {sentiment.confidence > 0 && (
              <span>Confidence: {(sentiment.confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}