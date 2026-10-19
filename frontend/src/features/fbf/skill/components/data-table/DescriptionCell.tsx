/**
 * DescriptionCell – Inline-editable description cell with tooltip.
 *
 * Renders truncated text. Shows full text via native title tooltip on hover.
 * Click → textarea for editing. Blur/Enter → save. Escape → revert.
 */

import { useState } from 'react';

import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';
import { cellEditTriggerVariants } from '@src/features/fbf/skill/utils/skillCurationVariants';

interface DescriptionCellProps {
  value: string | null;
  onCommit: (description: string | null) => void;
}

/**
 *
 */
export default function DescriptionCell({ value, onCommit }: DescriptionCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const displayText = value || '–';

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value ?? '');
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    const newValue = trimmed || null;
    if (newValue !== value) {
      onCommit(newValue);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="block" onClick={(e) => e.stopPropagation()}>
        <Textarea
          value={draft}
          autoFocus
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === 'Escape') cancel();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cellEditTriggerVariants()}
      onClick={startEdit}
    >
      <Text as="span" size="sm" lineClamp={2} title={value || undefined}>
        {displayText}
      </Text>
    </div>
  );
}
