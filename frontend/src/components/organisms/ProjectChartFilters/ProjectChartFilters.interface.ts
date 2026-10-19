export interface ProjectChartFiltersProps {
  filterProps: {
    title?: string
    jobRoles?: { id: number; name: string }[]
    selectedJobRole?: number | null
    selectedWeeks?: number
    onJobRoleChange?: (value: string) => void
    onWeeksChange?: (weeks: number) => void
    rangeOptions?: readonly { label: string; weeks: number }[]
  }
}
