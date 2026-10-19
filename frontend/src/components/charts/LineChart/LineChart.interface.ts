export interface LineChartProps {
  data: Record<string, unknown>[]
  xDataKey: string
  lines: { dataKey: string; stroke?: string; strokeWidth?: number; name?: string; dot?: boolean | object }[]
  height?: number
  loading?: boolean
  errorMessage?: string
}
