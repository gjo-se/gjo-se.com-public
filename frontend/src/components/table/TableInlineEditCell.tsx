import { useEffect, useRef, useState } from 'react';

import Input from '@src/components/primitives/Input';

export interface TableInlineEditCellProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  /** When true, renders a <textarea> instead of <input>. Enter inserts a newline; Ctrl+Enter / blur saves. */
  textarea?: boolean;
  /** Placeholder shown when the value is empty. Defaults to an en dash (–); pass '' for a blank cell. */
  emptyPlaceholder?: string;
}

/**
 * TableInlineEditCell – Inline-editable table cell.
 *
 * Default: displays text. Click → Input with autoFocus.
 * Enter / blur → save. Escape → cancel (revert to original).
 *
 * textarea mode: Click → textarea. Enter = newline, Ctrl+Enter / blur = save.
 * Displayed value uses whitespace-pre-wrap to show line breaks.
 */
export default function TableInlineEditCell({
  value,
  onSave,
  textarea,
  emptyPlaceholder = '\u2013',
}: TableInlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && wrapperRef.current) {
      const el = textarea
        ? wrapperRef.current.querySelector('textarea')
        : wrapperRef.current.querySelector('input');
      (el as HTMLElement)?.focus();
    }
  }, [editing, textarea]);

  const commit = () => {
    setEditing(false);
    if (draft === value) return;
    void onSave(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const isEmpty = !value;

  if (editing) {
    return (
      <span onClick={(e) => e.stopPropagation()}>
        <div ref={wrapperRef}>
          {textarea ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  commit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancel();
                }
              }}
              rows={4}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 resize-y font-mono"
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                if (e.key === 'Escape') { e.preventDefault(); cancel(); }
              }}
            />
          )}
        </div>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`w-full cursor-pointer rounded px-1 -mx-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-7 ${isEmpty ? 'text-on-surface-muted' : ''} ${textarea ? 'whitespace-pre-wrap' : ''}`}
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
    >
      {value || emptyPlaceholder}
    </button>
  );
}
