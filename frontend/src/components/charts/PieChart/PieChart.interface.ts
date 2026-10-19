export interface PieChartProps {
  data: { name: string; value: number }[]
  dataKey?: string
  height?: number
  donut?: boolean
  loading?: boolean
  errorMessage?: string
}
