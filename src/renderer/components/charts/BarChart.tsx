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

export function BarChart({ data, xKey, yKey, xLabel, yLabel, title, color = 'rgb(59, 130, 246)' }: BarChartProps) {
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
      <Bar data={chartData} options={options} />
    </div>
  );
}