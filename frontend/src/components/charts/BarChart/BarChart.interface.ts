export interface BarChartProps {
  data: Record<string, unknown>[]
  xDataKey: string
  bars: { dataKey: string; fill?: string; name?: string; radius?: [number, number, number, number] }[]
  height?: number
  loading?: boolean
  errorMessage?: string
}
