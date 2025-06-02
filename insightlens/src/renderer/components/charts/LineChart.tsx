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