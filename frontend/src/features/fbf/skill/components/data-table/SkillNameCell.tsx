/**
 * SkillNameCell – Inline-editable skill name cell for the curation table.
 *
 * Renders the skill name as plain text. On click, switches to an input field.
 * Commits on blur or enter; reverts on escape. Mirrors the Dedup BoardCard pattern.
 */

import { useState } from 'react';

import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import { cellEditTriggerVariants } from '@src/features/fbf/skill/utils/skillCurationVariants';

interface SkillNameCellProps {
  name: string;
  onRename: (name: string) => void;
}

/** Click-to-edit name cell: text → input on click, save on blur/enter, revert on escape. */
export default function SkillNameCell({ name, onRename }: SkillNameCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setDraft(name);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <Text as="span" onClick={(e) => e.stopPropagation()}>
        <Input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      </Text>
    );
  }

  return (
    <div
      className={cellEditTriggerVariants()}
      onClick={startEdit}
    >
      <Text size="sm">{name}</Text>
    </div>
  );
}
