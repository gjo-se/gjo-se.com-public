import type { ChartTooltipProps } from './ChartTooltip.interface';

/**
 * ChartTooltip – ECharts tooltip formatter shell.
 *
 * Used as a prop carrier: the `renderValue` callback is extracted by ComposedChart
 * and passed to the echarts `tooltip.formatter`.
 *
 * Renders nothing on its own – its only purpose is to carry the `renderValue` callback
 * in a way that keeps the `ComposedChartProps.tooltip` interface unchanged.
 */
export default function ChartTooltip(_props: ChartTooltipProps): null {
  return null;
}

export type { ChartTooltipProps } from './ChartTooltip.interface';
