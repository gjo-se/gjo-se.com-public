/**
 * InlineMarkdownEditRow – DetailTable-Grid-Zeile für inline-editierbare
 * Markdown-Langtexte.
 *
 * Click → Textarea (3 Zeilen), Blur/Cmd+Enter → Save, Escape → Cancel.
 * Vorschau rendert Markdown. Wird von den Story-Feldern (ApplicationProfile)
 * und den Portfolio-Translation-Feldern geteilt.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';

import { ROW } from './InlineMarkdownEditRow.utils';
import { inlineMarkdownDisplayVariants } from './InlineMarkdownEditRow.variants';

export interface InlineMarkdownEditRowProps {
  label: string
  field: string
  value: string | null
  onSave: (field: string, value: string) => Promise<void>
}

/** Inline-editierbare Langtext-Zeile im DetailTable-Stil (Markdown-Vorschau). */
export default function InlineMarkdownEditRow({
  label,
  field,
  value,
  onSave,
}: InlineMarkdownEditRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = useCallback(async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === (value ?? '')) return;
    await onSave(field, trimmed);
  }, [draft, value, field, onSave]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(value ?? '');
  }, [value]);

  const display = value?.trim() ? <Markdown>{value}</Markdown> : '\u2013';

  return (
    <div className={ROW}>
      <Text as="label" size="xs" weight="medium" uppercase color="muted">
        {label}
      </Text>
      <div className="overflow-hidden">
        {editing ? (
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); cancel(); }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void commit(); }
            }}
            rows={3}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            className={inlineMarkdownDisplayVariants()}
            onClick={() => { setDraft(value ?? ''); setEditing(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDraft(value ?? ''); setEditing(true); }
            }}
            title={value ?? undefined}
          >
            {display}
          </div>
        )}
      </div>
    </div>
  );
}

export type { InlineMarkdownEditRowVariants } from './InlineMarkdownEditRow.variants';
