import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from './charts/LineChart';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { queries } from '../services/queries';

export function SentimentTrend() {
  const { data: trendData } = useQuery({
    queryKey: ['sentiment-trend'],
    queryFn: async () => {
      // Get sentiment scores over time
      const result = await queries.sentimentTrend();

      return result.map((item: any) => ({
        ...item,
        period: `${item.semester} ${item.year}`
      }));
    }
  });

  // Calculate trend
  const trend = React.useMemo(() => {
    if (!trendData || trendData.length < 2) return null;
    
    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum: number, d: any) => sum + (d.avg_sentiment || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum: number, d: any) => sum + (d.avg_sentiment || 0), 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }, [trendData]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-primary-800">
          Sentiment Trend
        </h2>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-success-500' : 'text-error-500'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trend > 0 ? '+' : ''}{trend.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {trendData && trendData.length > 0 ? (
        <LineChart
          data={trendData}
          xKey="period"
          yKey="avg_sentiment"
          xLabel="Period"
          yLabel="Average Sentiment"
        />
      ) : (
        <div className="h-64 flex items-center justify-center text-primary-600">
          <div className="text-center">
            <p>No sentiment data available</p>
            <p className="text-sm mt-2">Sentiment scores will appear here once comments are analyzed</p>
          </div>
        </div>
      )}
    </Card>
  );
}