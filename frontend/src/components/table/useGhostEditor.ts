/**
 * useGhostEditor – generischer Ghost-Row-Controller für Tabellen.
 *
 * Kapselt das in FE-Table-Komponenten kopierte Muster: Ghost-State
 * (open/data/saving/error), Cmd/Ctrl+Enter (öffnen bzw. absenden), Escape
 * (schließen), Validierung und Submit. Aufrufer liefern `defaults`, `validate`
 * und `onSubmit`; das Ghost-Row-Markup bleibt feature-spezifisch.
 */

import { useCallback, useEffect, useState } from 'react';

export interface GhostEditor {
  open: boolean;
  data: Record<string, string>;
  saving: boolean;
  error: string | null;
  openGhost: () => void;
  closeGhost: () => void;
  submitGhost: () => Promise<void>;
  onFieldChange: (field: string, value: string) => void;
}

/** Validates ghost-row data; returns a German error message or null. */
export type GhostRowValidator = (data: Record<string, string>) => string | null;

/**
 * Controller for a ghost (quick-create) row.
 *
 * Args:
 *   defaults: Initial field values (must be stable, e.g. a module constant).
 *   validate: Returns an error message or null.
 *   onSubmit: Returns an error message on failure, or null on success.
 *
 * Returns:
 *   The ghost editor state and handlers.
 */
export function useGhostEditor(
  defaults: Record<string, string>,
  validate: GhostRowValidator,
  onSubmit: (data: Record<string, string>) => Promise<string | null>,
): GhostEditor {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Record<string, string>>({ ...defaults });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openGhost = useCallback(() => {
    setData({ ...defaults });
    setError(null);
    setOpen(true);
  }, [defaults]);

  const closeGhost = useCallback(() => {
    setOpen(false);
    setData({ ...defaults });
    setError(null);
  }, [defaults]);

  const submitGhost = useCallback(async () => {
    if (saving) return;
    const validationError = validate(data);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    const submitError = await onSubmit(data);
    setSaving(false);
    if (submitError) {
      setError(submitError);
    } else {
      closeGhost();
    }
  }, [saving, data, validate, onSubmit, closeGhost]);

  const onFieldChange = useCallback((field: string, value: string) => {
    setError(null);
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Cmd/Ctrl+Enter opens the ghost; while open it submits.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (open) {
          e.preventDefault();
          void submitGhost();
          return;
        }
        e.preventDefault();
        openGhost();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, openGhost, submitGhost]);

  // Escape closes the ghost.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGhost();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeGhost]);

  return { open, data, saving, error, openGhost, closeGhost, submitGhost, onFieldChange };
}
