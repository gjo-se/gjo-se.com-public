export interface ComposedChartProps {
  chartProps: {
    data: Record<string, unknown>[]
    xDataKey: string
    bars: {
      dataKey: string
      fill?: string
      name?: string
      onClick?: (data: unknown, index: number) => void
    }[]
    lines?: {
      dataKey: string
      stroke?: string
      name?: string
      strokeDasharray?: string
      connectNulls?: boolean
    }[]
    showLegend?: boolean
    height?: number
    loading?: boolean
    errorMessage?: string
  }
  tooltip?: React.ReactElement
}
