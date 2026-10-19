/** Hex fallbacks for CSS custom properties used by the chart (echarts canvas needs hex, not CSS vars). */
export function resolveColor(cssVar: string): string {
  const FALLBACK: Record<string, string> = {
    'var(--color-chart-1)': '#3b82f6',
    'var(--color-chart-2)': '#f59e0b',
    'var(--color-chart-3)': '#10b981',
    'var(--color-chart-4)': '#ef4444',
    'var(--color-chart-5)': '#8b5cf6',
    'var(--color-chart-6)': '#ec4899',
    'var(--color-chart-7)': '#06b6d4',
    'var(--color-chart-8)': '#84cc16',
    'var(--color-border)': '#e5e7eb',
    'var(--color-muted-foreground)': '#6b7280',
  };
  return FALLBACK[cssVar] ?? cssVar;
}

export const COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)',
  'var(--color-chart-7)', 'var(--color-chart-8)',
];

export const GRID = { top: 8, right: 16, bottom: 0, left: 0 };
