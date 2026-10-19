import type { ProjectChartFiltersProps } from './ProjectChartFilters.interface';

export type JobRoleItem = NonNullable<ProjectChartFiltersData['jobRoles']>[number];

export type ProjectChartFiltersData = ProjectChartFiltersProps['filterProps'];

export type RangeOption = NonNullable<ProjectChartFiltersData['rangeOptions']>[number];
