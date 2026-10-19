import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import Skeleton from '@src/components/primitives/Skeleton';
import Text from '@src/components/primitives/Text';

import { getEchartsTheme } from './ChartShell.utils';
import { useThemeClass } from './useThemeClass';

import type { ChartShellProps } from './ChartShell.interface';

/**
 * Shared chart wrapper – loading skeleton, error state, echarts container.
 *
 * @remarks
 * ## Migration path (recharts → echarts)
 * - `option`-Prop: renders via echarts-for-react (target API).
 * - `children`-Prop: legacy recharts content, rendered in a plain div during
 *   the transition. Individual chart wrappers (AreaChart, BarChart, …) will be
 *   migrated in follow-up tickets to pass `option` instead of recharts children.
 */
export default function ChartShell({
  loading,
  errorMessage,
  height = 220,
  option,
  children,
  onChartReady,
}: ChartShellProps) {
  const themeClass = useThemeClass();
  const theme = useMemo(() => {
    // Re-resolve token colors whenever the theme class changes.
    void themeClass;
    return getEchartsTheme();
  }, [themeClass]);

  if (loading) return <Skeleton size="image" />;
  if (errorMessage)
    return (
      <Text size="sm" color="error">
        {errorMessage}
      </Text>
    );

  if (option) {
    return (
      <ReactECharts
        key={themeClass}
        option={option}
        theme={theme}
        style={{ height, width: '100%' }}
        notMerge
        onChartReady={onChartReady}
      />
    );
  }

  // Legacy path: recharts children during migration.
  // ResponsiveContainer is removed; wrappers will be updated in follow-up tickets.
  return <div style={{ height, width: '100%' }}>{children}</div>;
}

export type { ChartShellProps } from './ChartShell.interface';
