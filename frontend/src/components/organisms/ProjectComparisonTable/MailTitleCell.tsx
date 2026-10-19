import { useState } from 'react';
import { toast } from 'sonner';

import Input from '@src/components/primitives/Input';
import { setProjectTitleNormalized } from '@src/lib/api/aiscope';

export interface MailTitleCellProps {
  /** Canonical project id whose curated mail title is edited. */
  projectId: number;
  /** Current curated value (`project.title_normalized`; null = no override). */
  value: string | null;
  /** Scraped title, shown as the placeholder when no override is set. */
  fallback: string;
  /** Called after a successful save so the table reloads its data. */
  onRefetch: () => void;
}

/**
 * MailTitleCell – inline editor for the master's curated mail title.
 *
 * The value (`project.title_normalized`) is the single role source for subject
 * and body of the application mail – curated here once instead of patching the
 * rendered mail. Saves on blur (project-wide inline-edit convention, no extra
 * button); an empty value clears the override (fallback: the normalized
 * scraped title, shown as the placeholder).
 */
export default function MailTitleCell({
  projectId,
  value,
  fallback,
  onRefetch,
}: MailTitleCellProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Resync the draft when a fresh value arrives (e.g. after refetch).
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value ?? '');
  }

  const dirty = draft.trim() !== (value ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await setProjectTitleNormalized(projectId, draft.trim() || null);
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      value={draft}
      placeholder={fallback}
      disabled={saving}
      aria-label="Titel für die Bewerbungs-Mail"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (dirty) void save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
