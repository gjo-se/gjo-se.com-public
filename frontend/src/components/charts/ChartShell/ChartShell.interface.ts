import type { EChartsOption } from 'echarts';
import type { EChartsInstance } from 'echarts-for-react';

export interface ChartShellProps {
  loading?: boolean
  errorMessage?: string
  height?: number
  /** ECharts option object. When set, renders via echarts-for-react instead of children. */
  option?: EChartsOption
  /** Legacy recharts children – will be removed after full echarts migration. */
  children?: React.ReactNode
  /** Callback when echarts instance is ready. Use for event binding (e.g. click). */
  onChartReady?: (instance: EChartsInstance) => void
}
