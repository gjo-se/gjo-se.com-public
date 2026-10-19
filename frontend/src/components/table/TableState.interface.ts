export interface TableStateProps<T> {
  data: T[]
  total: number
  q: string
  page: number
  size: number
  sort: string
  order: 'asc' | 'desc'
  tableKey: string
  setQ: (value: string) => void
  setPage: (value: number) => void
  setSize: (value: number) => void
  setSort: (field: string, order?: 'asc' | 'desc') => void
  handleSearchChange: (value: string) => void
  resetUrlState: () => void
}
