/**
 * ECharts-compatible tooltip formatter props.
 * `renderValue` returns an HTML string rendered inside the echarts tooltip.
 */
export interface ChartTooltipProps {
  renderValue: (value: number) => string
}
