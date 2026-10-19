/**
 * useInlineEdit – shared state for click-to-edit cells.
 *
 * Encapsulates the `editing`/`draft` state, the focus-on-edit effect and the
 * trim-compare commit / revert-to-value cancel semantics used by the inline
 * text/markdown cells (StatementCell, SkillGroupLabelCell, QuestionCell …).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

export interface UseInlineEditResult {
  editing: boolean
  draft: string
  setDraft: (value: string) => void
  /** Enters edit mode with a fresh draft from the current value. */
  start: () => void
  /** Trims the draft and saves when changed, then leaves edit mode. */
  commit: () => void
  /** Leaves edit mode and restores the draft to the current value. */
  cancel: () => void
  /** Ref for the edit textarea (focused on entering edit mode). */
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

/**
 *
 */
export function useInlineEdit(value: string, onSave: (value: string) => void): UseInlineEditResult {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === value) return;
    onSave(trimmed);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(value);
  }, [value]);

  const start = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  return { editing, draft, setDraft, start, commit, cancel, textareaRef };
}
