import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './Card';
import { queries } from '../services/queries';

interface QuickInsightsProps {
  type: 'trending-up' | 'need-attention';
}

export function QuickInsights({ type }: QuickInsightsProps) {
  // Fetch trending up units
  const { data: trendingUp } = useQuery({
    queryKey: ['quick-insights', 'trending-up'],
    queryFn: async () => {
      return queries.trendingUp();
    },
    enabled: type === 'trending-up'
  });

  // Fetch units needing attention
  const { data: needAttention } = useQuery({
    queryKey: ['quick-insights', 'need-attention'],
    queryFn: async () => {
      return queries.needsAttention();
    },
    enabled: type === 'need-attention'
  });

  const data = type === 'trending-up' ? trendingUp : needAttention;
  const title = type === 'trending-up' ? 'Units Trending Up' : 'Units Needing Attention';
  const icon = type === 'trending-up' ? 
    <TrendingUp className="w-6 h-6 text-success-500 dark:text-success-300" /> :
    <AlertCircle className="w-6 h-6 text-warning-500 dark:text-warning-300" />;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100 font-serif">{title}</h2>
      </div>

      {!data || data.length === 0 ? (
        <p className="text-sm text-primary-600 dark:text-primary-300">
          {type === 'trending-up' 
            ? 'No units showing significant improvement'
            : 'No units currently need attention'}
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((unit: any, index: number) => (
            <Link
              key={index}
              to={`/unit/${unit.unit_code}`}
              className="block p-4 bg-primary-50 dark:bg-primary-950 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-primary-800 dark:text-primary-100">
                    {unit.unit_code} - {unit.unit_name}
                  </h3>
                  <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">
                    {unit.latest_semester || unit.semester} {unit.latest_year || unit.year}
                  </p>
                </div>
                
                <div className="text-right ml-4">
                  {type === 'trending-up' ? (
                    <>
                      <div className="flex items-center gap-1 text-success-500 dark:text-success-300">
                        <ArrowUp className="w-4 h-4" />
                        <span className="font-medium">
                          +{unit.score_change.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">
                        Now: {unit.latest_score.toFixed(1)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-warning-500 dark:text-warning-300">
                        {unit.issue_type}
                      </p>
                      <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">
                        Score: {unit.latest_score.toFixed(1)}%
                      </p>
                      {unit.issue_type === 'Low Response Rate' && (
                        <p className="text-xs text-primary-600 dark:text-primary-300">
                          Response: {unit.response_rate.toFixed(1)}%
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}