/**
 * GroupCell – Group assignment cell rendering the label as text by default.
 *
 * Mirrors DescriptionCell: shows the curated group label (or '–') as plain
 * text; click switches to the Combobox for editing. Selecting a value (or
 * "Keinen Wert setzen") commits and closes the editor.
 */

import { useState } from 'react';

import Text from '@src/components/primitives/Text';
import { useSkillGroups } from '@src/features/fbf/skill/hooks/useSkillGroups';
import { cellEditTriggerVariants } from '@src/features/fbf/skill/utils/skillCurationVariants';

import GroupSelectCell from './GroupSelectCell';

export interface GroupCellProps {
  value: number | null
  onCommit: (value: number | null) => void
}

/** Renders the group label as text by default, editable Combobox on click. */
export default function GroupCell({ value, onCommit }: GroupCellProps) {
  const [editing, setEditing] = useState(false);
  const { groups } = useSkillGroups();

  const label = groups.find((group) => group.id === value)?.label ?? null;

  if (editing) {
    return (
      <GroupSelectCell
        value={value}
        onCommit={(next) => {
          setEditing(false);
          onCommit(next);
        }}
      />
    );
  }

  return (
    <div
      className={cellEditTriggerVariants()}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      <Text as="span" size="sm" lineClamp={1} title={label ?? undefined}>
        {label ?? '–'}
      </Text>
    </div>
  );
}
