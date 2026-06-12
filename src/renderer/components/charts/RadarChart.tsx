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
import { useChartTheme } from './chartTheme';

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
  // Theme colors for canvas-painted elements; re-renders on theme change.
  const theme = useChartTheme();

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
        backgroundColor: 'rgba(74, 124, 89, 0.2)',
        borderColor: 'rgb(74, 124, 89)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(74, 124, 89)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(74, 124, 89)'
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
      r: {
        angleLines: {
          display: true,
          color: theme.grid
        },
        grid: { color: theme.grid },
        pointLabels: { color: theme.text },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
          color: theme.mutedText,
          // Radar tick labels sit on the chart body; an opaque backdrop
          // matching the surface keeps them readable in both themes.
          backdropColor: theme.isDark ? '#1a1f20' : '#ffffff'
        }
      }
    }
  };

  // Accessible name for screen readers — canvas charts are otherwise opaque.
  const ariaLabel = title
    ? `Radar chart: ${title}`
    : `Radar chart of percent agreement across ${data.length} categories`;

  return (
    <div className="h-64" role="img" aria-label={ariaLabel}>
      <Radar data={chartData} options={options} />
    </div>
  );
}