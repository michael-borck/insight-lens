import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  data: any[];
  labelKey: string;
  valueKey: string;
  title?: string;
}

export function RadarChart({ data, labelKey, valueKey, title }: RadarChartProps) {
  const chartData = {
    labels: data.map(d => {
      const label = d[labelKey];
      // Capitalize first letter
      return label.charAt(0).toUpperCase() + label.slice(1);
    }),
    datasets: [
      {
        label: 'Percent Agreement',
        data: data.map(d => d[valueKey]),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
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
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Radar data={chartData} options={options} />
    </div>
  );
}