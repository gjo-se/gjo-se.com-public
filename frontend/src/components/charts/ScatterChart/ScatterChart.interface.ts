export interface ScatterChartProps {
  data: { name: string; data: { x: number; y: number }[] }[]
  loading?: boolean
  errorMessage?: string
  height?: number
}
