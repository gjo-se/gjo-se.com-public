import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';

import Dropdown from '../../molecules/Dropdown/Dropdown';

import type { ProjectChartFiltersProps } from './ProjectChartFilters.interface';

export type { ProjectChartFiltersProps } from './ProjectChartFilters.interface';
export type { JobRoleItem, ProjectChartFiltersData, RangeOption } from './ProjectChartFilters.types';
/**
 * ProjectChartFilters – Filter-Leiste für Projekt-Trend-Diagramme.
 * Range-Buttons (1Q/2Q/1J) und Job-Role-Dropdown.
 * Kein className-Prop – Styling ausschließlich über Props.
 */
export default function ProjectChartFilters({
  filterProps: {
    title,
    jobRoles,
    selectedJobRole,
    selectedWeeks,
    onJobRoleChange,
    onWeeksChange,
    rangeOptions = [
      { label: '1 Q', weeks: 13 },
      { label: '2 Q', weeks: 26 },
      { label: '1 J', weeks: 52 },
    ],
  },
}: ProjectChartFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="mb-2">
        <Text variant="h2">{title ?? 'Eingestellte Projekte je KW'}</Text>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex">
          {rangeOptions.map(({ label, weeks }) => (
            <Button
              key={weeks}
              onClick={() => onWeeksChange?.(weeks)}
              variant={selectedWeeks === weeks ? 'default' : 'secondary'}
              size="sm"
              aria-pressed={selectedWeeks === weeks}
            >
              {label}
            </Button>
          ))}
        </div>
        {jobRoles && (
          <Dropdown
            items={[
              { value: '', label: 'Alle Job-Rollen' },
              ...jobRoles.map((jr) => ({ value: String(jr.id), label: jr.name })),
            ]}
            selectedValue={selectedJobRole?.toString() ?? ''}
            onSelect={(value) => onJobRoleChange?.(value)}
          />
        )}
      </div>
    </div>
  );
}
