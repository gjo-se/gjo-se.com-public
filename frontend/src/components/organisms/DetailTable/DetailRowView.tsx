import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';

import { DASH, ROW } from './DetailRowView.utils';
import { detailRowValueWrapperVariants } from './DetailRowView.variants';

import type { DetailRow } from './DetailTable.types';

interface DetailRowViewProps {
  row: DetailRow;
  onSave: (field: string, value: string) => Promise<void>;
}

export type { DetailRowViewVariants } from './DetailRowView.variants';

/** Single key-value row with click-to-edit (blur/Enter → save, Escape → cancel). */
export default function DetailRowView({ row, onSave }: DetailRowViewProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.value ?? '');
  const [saving, setSaving] = useState(false);
  // Focus the inner input element when editing starts.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing && wrapperRef.current) {
      const input = wrapperRef.current.querySelector('input');
      input?.focus();
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    setEditValue(row.value ?? '');
    setEditing(true);
  }, [row.value]);

  const commit = useCallback(async () => {
    if (saving) return;
    const newVal = editValue.trim();
    if (newVal === (row.value ?? '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(row.field, newVal);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [editValue, row.value, row.field, onSave, saving]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (row.url && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl+Click → open external URL in new tab
        window.open(externalHref(row.url), '_blank', 'noopener,noreferrer');
        return;
      }
      startEdit();
    },
    [row.url, startEdit],
  );

  const cancel = useCallback(() => {
    setEditing(false);
    setEditValue(row.value ?? '');
  }, [row.value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );

  const display = row.value || DASH;

  return (
    <div className={ROW}>
      {/* Label */}
      <Text as="label" size="xs" weight="medium" uppercase color="muted">
        {row.label}
      </Text>

      {/* Value */}
      <div className="overflow-hidden">
        {row.renderValue ? (
          row.renderValue()
        ) : editing ? (
          <div ref={wrapperRef} className={detailRowValueWrapperVariants()}>
            <Input
              value={editValue}
              onChange={(e) => setEditValue((e.target as HTMLInputElement).value)}
              onBlur={() => void commit()}
              onKeyDown={handleKeyDown}
              disabled={saving}
            />
          </div>
        ) : row.url ? (
          <Button
            variant="cell-link"
            onClick={handleClick}
            title={row.url ? `Bearbeiten | ⌘+Klick: ${row.url}` : undefined}
          >
            {display}
          </Button>
        ) : (
          <Button
            variant="cell-edit"
            onClick={startEdit}
          >
            {display}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Ensure a URL has an https:// prefix for external links. */
function externalHref(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `https://${raw}`;
}
