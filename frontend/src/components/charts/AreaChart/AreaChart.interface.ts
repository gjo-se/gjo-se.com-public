export interface AreaChartProps {
  data: Record<string, unknown>[]
  xDataKey: string
  areas: { dataKey: string; stroke?: string; fill?: string; name?: string }[]
  height?: number
  loading?: boolean
  errorMessage?: string
}
