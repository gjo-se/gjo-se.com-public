export interface RadarChartProps {
  data: { subject: string; [key: string]: string | number }[]
  radars: { dataKey: string; name?: string; stroke?: string; fill?: string; fillOpacity?: number }[]
  loading?: boolean
  errorMessage?: string
  height?: number
  /** Maximum value for the radius axis (default: 'auto'). */
  maxValue?: number
  /** Show the Recharts Legend (default: true). */
  showLegend?: boolean
  /** Show the Recharts Tooltip (default: true). */
  showTooltip?: boolean
  /**
   * Shade alternating value-range bands (rings 1–2 and 3–4) so values are
   * easier to read off the axis. Opt-in so public charts stay unchanged.
   */
  showSplitArea?: boolean
}
