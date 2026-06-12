import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useChartTheme } from './chartTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  title?: string;
  color?: string;
}

export function BarChart({ data, xKey, yKey, xLabel, yLabel, title, color = 'rgb(74, 124, 89)' }: BarChartProps) {
  // Theme colors for canvas-painted elements; re-renders on theme change.
  const theme = useChartTheme();

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-primary-50 dark:bg-primary-950 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-700">
        <div className="text-center">
          <div className="text-primary-500 dark:text-primary-400 mb-2">📊</div>
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif mb-1">No Data Available</h3>
          <p className="text-sm text-primary-600 dark:text-primary-300">No data points found for this chart</p>
        </div>
      </div>
    );
  }

  // Check if required keys exist in data
  const firstRow = data[0];
  if (!firstRow || !firstRow.hasOwnProperty(xKey) || !firstRow.hasOwnProperty(yKey)) {
    return (
      <div className="h-64 flex items-center justify-center bg-primary-50 dark:bg-primary-950 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-700">
        <div className="text-center">
          <div className="text-primary-500 dark:text-primary-400 mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif mb-1">Chart Configuration Error</h3>
          <p className="text-sm text-primary-600 dark:text-primary-300">Required columns '{xKey}' or '{yKey}' not found in data</p>
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
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1
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
        text: title,
        color: theme.text
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        borderColor: theme.tooltipBorder,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        title: {
          display: !!xLabel,
          text: xLabel,
          color: theme.text
        },
        ticks: { color: theme.text },
        grid: { color: theme.grid }
      },
      y: {
        title: {
          display: !!yLabel,
          text: yLabel,
          color: theme.text
        },
        ticks: { color: theme.text },
        grid: { color: theme.grid },
        beginAtZero: true
      }
    }
  };

  // Accessible name for screen readers — canvas charts are otherwise opaque.
  const ariaLabel = title
    ? `Bar chart: ${title}`
    : `Bar chart of ${yLabel || yKey} by ${xLabel || xKey}`;

  return (
    <div className="h-64" role="img" aria-label={ariaLabel}>
      <Bar data={chartData} options={options} />
    </div>
  );
}