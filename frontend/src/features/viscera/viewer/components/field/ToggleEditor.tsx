import { useCallback } from 'react';

import Checkbox from '@src/components/primitives/Checkbox/Checkbox';

import type { WriteResult } from '../../hooks/useYamlWrite';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ToggleEditorProps {
  value: boolean;
  field: string;
  objectId: string;
  onSave: (objectId: string, field: string, value: unknown) => Promise<WriteResult>;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Checkbox/toggle editor for boolean fields (e.g. "external").
 *
 * Changes are saved immediately via the debounced ``onSave`` callback.
 */
export function ToggleEditor({ value, field, objectId, onSave }: ToggleEditorProps) {
  const handleChange = useCallback(
    (checked: boolean) => {
      onSave(objectId, field, checked);
    },
    [objectId, field, onSave],
  );

  return (
    <Checkbox
      checked={value}
      onChange={handleChange}
      label="Externes System"
    />
  );
}
