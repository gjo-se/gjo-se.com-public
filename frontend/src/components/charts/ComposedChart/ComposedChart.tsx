import { useCallback, useMemo } from 'react';


import ChartShell from '../ChartShell/ChartShell';
import { buildCartesianOption, chartHeight, getAxisLabelColor, getGridStrokeColor } from '../ChartShell/ChartShell.utils';

import type { ComposedChartProps } from './ComposedChart.interface';
import type { ChartShellProps } from '../ChartShell/ChartShell.interface';
import type { ChartTooltipProps } from '../ChartTooltip/ChartTooltip.interface';
import type { EChartsOption, EChartsType } from 'echarts';

export type { ComposedChartProps } from './ComposedChart.interface';
export type { ComposedChartBar, ComposedChartLine } from './ComposedChart.types';

/** Renders an echarts composed chart combining bars and lines with optional legend and custom tooltip formatter. */
export default function ComposedChart({
  chartProps: { data, xDataKey, bars, lines, showLegend, height = chartHeight, loading, errorMessage },
  tooltip,
}: ComposedChartProps) {
  const renderValue = useMemo(
    () => (tooltip as React.ReactElement<ChartTooltipProps>)?.props?.renderValue,
    [tooltip],
  );

  const onChartReady: ChartShellProps['onChartReady'] = useCallback(
    (instance: EChartsType) => {
      instance.on('click', (params) => {
        if (params.seriesType === 'bar') {
          const idx = params.seriesIndex ?? 0;
          const bar = bars[idx];
          bar?.onClick?.(params.value, params.dataIndex);
        }
      });
    },
    [bars],
  );

  const option: EChartsOption = useMemo(() => {
    const barSeries = bars.map((b) => ({
      type: 'bar' as const,
      data: data.map((d) => d[b.dataKey] as number | string),
      name: b.name ?? b.dataKey,
      itemStyle: {
        color: b.fill,
        borderRadius: [3, 3, 0, 0],
      },
      cursor: b.onClick ? ('pointer' as const) : undefined,
    }));

    const lineSeries = (lines ?? []).map((l) => ({
      type: 'line' as const,
      data: data.map((d) => d[l.dataKey] as number | string),
      name: l.name ?? l.dataKey,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        color: l.stroke,
        width: 2,
        type: l.strokeDasharray ? ('dashed' as const) : ('solid' as const),
      },
      connectNulls: l.connectNulls,
    }));

    const base = buildCartesianOption(
      data,
      xDataKey,
      [...barSeries, ...lineSeries],
      getGridStrokeColor(),
      getAxisLabelColor(),
    );

    const yAxis = { ...(base.yAxis as Record<string, unknown>), minInterval: 1 };

    const legend = showLegend ? { show: true, top: 0 } : { show: false };

    const tooltipOption: EChartsOption['tooltip'] = renderValue
      ? {
          trigger: 'axis' as const,
          formatter: (paramsOrArr) => {
            const arr = Array.isArray(paramsOrArr) ? paramsOrArr : [paramsOrArr];
            if (!arr.length) return '';
            const first = arr[0];
            const barParam =
              arr.find((p) => p.seriesType === 'bar') ?? first;
            const value = Number(barParam.value);
            const label = String(barParam.name);
            const html = renderValue(value);
            return `<div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}</div>${html}`;
          },
        }
      : { trigger: 'axis' as const };

    return { ...base, yAxis, legend, tooltip: tooltipOption };
  }, [data, xDataKey, bars, lines, showLegend, renderValue]);

  return (
    <ChartShell
      loading={loading}
      errorMessage={errorMessage}
      height={height}
      option={option}
      onChartReady={onChartReady}
    />
  );
}
