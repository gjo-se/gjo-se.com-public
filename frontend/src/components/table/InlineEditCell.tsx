/**
 * InlineEditCell – click-to-edit primitive for text/markdown table cells.
 *
 * Owns the `useInlineEdit` state and renders either a textarea (default) or a
 * single-line input while editing; the idle rendering is delegated via
 * `renderDisplay`. Replaces the copy-pasted editing blocks in the statement,
 * question and skill-group-label cells.
 */
import Input from '@src/components/primitives/Input';
import Textarea from '@src/components/primitives/Textarea/Textarea';
import { useInlineEdit } from '@src/hooks/useInlineEdit';

import InlineEditDisplay from './InlineEditDisplay';

import type { ReactNode } from 'react';

export interface InlineEditCellProps {
  /** Current value. */
  value: string;
  /** Persists the trimmed value; leaves edit mode. */
  onSave: (value: string) => void;
  /** Renders the idle state (inside `InlineEditDisplay`). */
  renderDisplay: (value: string) => ReactNode;
  /** Editing control: multiline `textarea` or single-line `input`. */
  variant?: 'textarea' | 'input';
  /** Accessible label for the `input` variant. */
  ariaLabel?: string;
}

/** Click-to-edit cell with a shared textarea/input editing branch. */
export default function InlineEditCell({
  value,
  onSave,
  renderDisplay,
  variant = 'textarea',
  ariaLabel,
}: InlineEditCellProps) {
  const { editing, draft, setDraft, start, commit, cancel, textareaRef } =
    useInlineEdit(value, onSave);

  if (editing) {
    if (variant === 'input') {
      return (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
          }}
          aria-label={ariaLabel}
        />
      );
    }
    return (
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
        }}
      />
    );
  }

  return (
    <InlineEditDisplay value={value} onStart={start}>
      {renderDisplay(value)}
    </InlineEditDisplay>
  );
}
