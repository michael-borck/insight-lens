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
      <div className="flex items-center justify-center h-64 text-gray-500">
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
          'rgba(34, 197, 94, 0.8)', // green-500
          'rgba(156, 163, 175, 0.8)', // gray-400
          'rgba(239, 68, 68, 0.8)', // red-500
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
          'rgb(239, 68, 68)',
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
            <Smile className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {((positive / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Positive</div>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Meh className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {((neutral / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Neutral</div>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Frown className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {((negative / total) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Negative</div>
        </div>
      </div>
    </div>
  );
}