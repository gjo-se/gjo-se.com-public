export interface ForceGraphProps {
  nodes: {
    id: string
    val?: number
    color?: string
    name?: string
    [key: string]: unknown
  }[]
  links: {
    source: string
    target: string
    value?: number
  }[]
  height?: number
  onNodeClick?: (node: ForceGraphProps['nodes'][number]) => void
  loading?: boolean
  errorMessage?: string
}
