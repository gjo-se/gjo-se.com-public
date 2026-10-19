/**
 * InlineScoreCell – Click-to-edit score cell (0–5) for the curation table.
 *
 * Renders the score as plain number text (or dash for null).
 * On click, switches to a combobox with semantic labels (e.g. "3 – Fortgeschritten").
 * Selection commits immediately and returns to display mode.
 * Mirrors the SkillNameCell click-to-edit pattern.
 */

import { useState } from 'react';

import SelectCombobox from '@src/components/molecules/SelectCombobox/SelectCombobox';
import Text from '@src/components/primitives/Text';
import { cellEditTriggerVariants } from '@src/features/fbf/skill/utils/skillCurationVariants';

const LEVEL_OPTIONS = [
  { value: '0', label: '0 – Unbekannt' },
  { value: '1', label: '1 – Grundlagen' },
  { value: '2', label: '2 – Erfahren' },
  { value: '3', label: '3 – Fortgeschritten' },
  { value: '4', label: '4 – Experte' },
  { value: '5', label: '5 – Lehren' },
];

const IMPORTANCE_OPTIONS = [
  { value: '2', label: '2 – Kontext' },
  { value: '3', label: '3 – Nice-to-have' },
  { value: '5', label: '5 – Must-Have' },
];

interface InlineScoreCellProps {
  value: number | null;
  field: ScoreField;
  onCommit: (value: number | null) => void;
}

export type ScoreField = 'level' | 'level_public' | 'importance';

const OPTIONS: Record<ScoreField, { value: string; label: string }[]> = {
  level: LEVEL_OPTIONS,
  level_public: LEVEL_OPTIONS,
  importance: IMPORTANCE_OPTIONS,
};

/** Click-to-edit score cell: number text → combobox on click, select → commit → display. */
export default function InlineScoreCell({ value, field, onCommit }: InlineScoreCellProps) {
  const [editing, setEditing] = useState(false);

  const options = OPTIONS[field];

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleCommit = (newValue: number | null) => {
    onCommit(newValue);
    setEditing(false);
  };

  if (editing) {
    return (
      <SelectCombobox
        options={options}
        value={value}
        onCommit={handleCommit}
        placeholder={value != null ? String(value) : '–'}
        autoFocus
        onBlur={cancelEdit}
        onEscape={cancelEdit}
      />
    );
  }

  return (
    <div
      className={cellEditTriggerVariants()}
      onClick={startEdit}
    >
      <Text size="sm">{value != null ? String(value) : '–'}</Text>
    </div>
  );
}
