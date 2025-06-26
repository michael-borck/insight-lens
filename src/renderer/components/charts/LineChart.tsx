import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  title?: string;
}

export function LineChart({ data, xKey, yKey, xLabel, yLabel, title }: LineChartProps) {
  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
          <p className="text-sm text-gray-500">No data points found for this chart</p>
        </div>
      </div>
    );
  }

  // Check if required keys exist in data
  const firstRow = data[0];
  if (!firstRow || !firstRow.hasOwnProperty(xKey) || !firstRow.hasOwnProperty(yKey)) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Chart Configuration Error</h3>
          <p className="text-sm text-gray-500">Required columns '{xKey}' or '{yKey}' not found in data</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d[xKey]),
    datasets: [
      {
        label: yLabel || yKey,
        data: data.map(d => d[yKey]),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: !!title,
        text: title
      }
    },
    scales: {
      x: {
        title: {
          display: !!xLabel,
          text: xLabel
        }
      },
      y: {
        title: {
          display: !!yLabel,
          text: yLabel
        },
        beginAtZero: true
      }
    }
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}