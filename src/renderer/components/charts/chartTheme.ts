import { useEffectiveTheme } from '../../hooks/useTheme';

// Theme-appropriate colors for Chart.js scaffolding (ticks, grid, legend,
// titles, tooltips). Hex values come from the Tailwind `primary` palette in
// tailwind.config.js — Chart.js paints on canvas, so the CSS cascade (and
// the `dark:` variants) can't reach it; we pass colors explicitly instead.
export interface ChartTheme {
  isDark: boolean;
  /** Axis ticks, axis/chart titles, legend labels. */
  text: string;
  /** Secondary text (e.g. point labels on radar charts). */
  mutedText: string;
  /** Grid and angle lines. */
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
}

export function getChartTheme(isDark: boolean): ChartTheme {
  if (isDark) {
    return {
      isDark,
      text: '#d4c5a9', // primary-300
      mutedText: '#c4b08a', // primary-400
      grid: 'rgba(245, 240, 232, 0.12)',
      tooltipBg: '#2d3436', // primary-800
      tooltipText: '#f5f0e8', // primary-100
      tooltipBorder: '#6b6358', // primary-700
    };
  }
  return {
    isDark,
    text: '#6b6358', // primary-700
    mutedText: '#8b7e6a', // primary-600
    grid: 'rgba(45, 52, 54, 0.1)',
    tooltipBg: '#2d3436', // primary-800
    tooltipText: '#f5f0e8', // primary-100
    tooltipBorder: '#2d3436',
  };
}

/**
 * Chart components call this to get theme colors *and* subscribe to theme
 * changes — switching theme re-renders the component, which hands Chart.js
 * a fresh options object and repaints the canvas.
 */
export function useChartTheme(): ChartTheme {
  return getChartTheme(useEffectiveTheme() === 'dark');
}
