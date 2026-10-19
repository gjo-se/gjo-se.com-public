export interface RadialBarChartProps {
  data: { name: string; value: number; fill?: string }[]
  loading?: boolean
  errorMessage?: string
  height?: number
}
