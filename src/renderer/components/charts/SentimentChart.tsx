import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Smile, Meh, Frown } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SentimentChartProps {
  positive: number;
  neutral: number;
  negative: number;
  showLegend?: boolean;
}

export function SentimentChart({ positive, neutral, negative, showLegend = true }: SentimentChartProps) {
  const total = positive + neutral + negative;
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-primary-600">
        No sentiment data available
      </div>
    );
  }

  const data = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [positive, neutral, negative],
        backgroundColor: [
          'rgba(74, 124, 89, 0.8)', // success-500
          'rgba(160, 149, 133, 0.8)', // primary-500
          'rgba(181, 74, 74, 0.8)', // error-500
        ],
        borderColor: [
          'rgb(74, 124, 89)',
          'rgb(160, 149, 133)',
          'rgb(181, 74, 74)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="h-48">
        <Doughnut data={data} options={options} />
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Smile className="w-6 h-6 text-success-500" />
          </div>
          <div className="text-2xl font-semibold text-primary-800">
            {((positive / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-primary-600">Positive</div>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Meh className="w-6 h-6 text-primary-500" />
          </div>
          <div className="text-2xl font-semibold text-primary-800">
            {((neutral / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-primary-600">Neutral</div>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Frown className="w-6 h-6 text-error-500" />
          </div>
          <div className="text-2xl font-semibold text-primary-800">
            {((negative / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-primary-600">Negative</div>
        </div>
      </div>
    </div>
  );
}