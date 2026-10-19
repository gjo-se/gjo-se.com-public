/** Combobox cell for assigning one of the skill groups (DB-driven, numeric ids). */

import SelectCombobox from '@src/components/molecules/SelectCombobox/SelectCombobox';
import { useSkillGroups } from '@src/features/fbf/skill/hooks/useSkillGroups';

export interface GroupSelectCellProps {
  value: number | null
  onCommit: (value: number | null) => void
}

/**
 * Assigns a skill group. Options come from the curated DB groups (localized label),
 * values are numeric group ids.
 */
export default function GroupSelectCell({ value, onCommit }: GroupSelectCellProps) {
  const { groups } = useSkillGroups();

  const options = groups.map((group) => ({ value: String(group.id), label: group.label }));

  return <SelectCombobox options={options} value={value} onCommit={onCommit} allowClear />;
}
