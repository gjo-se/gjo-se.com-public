import { useRef, useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Markdown from '@src/components/primitives/Markdown';
import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';
import { setProjectNotes } from '@src/lib/api/aiscope';

import { containerCls, headerStripCls } from '../ProjectDetailView/ProjectDetailView.constants';

export interface ProjectNotesSectionProps {
  /** Canonical project id whose notes are edited. */
  projectId: number;
  /** Current notes (`project.notes`, Markdown source; null = none). */
  notes: string | null;
  /** Called after a successful save so the page reloads its data. */
  onRefetch: () => void;
}

/**
 * ProjectNotesSection – free-text remarks (Markdown) of the canonical project.
 *
 * Renders the notes below the description section and edits them inline
 * (project-wide inline-edit convention: save on blur / Ctrl+Enter, Esc cancels).
 * An empty value clears the notes.
 */
export default function ProjectNotesSection({
  projectId,
  notes,
  onRefetch,
}: ProjectNotesSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);
  const [prevNotes, setPrevNotes] = useState(notes);
  const skipBlurRef = useRef(false);

  // Resync the draft when a fresh value arrives (e.g. after refetch).
  if (notes !== prevNotes) {
    setPrevNotes(notes);
    setDraft(notes ?? '');
  }

  const save = async () => {
    // Skip the blur React fires when the textarea gets disabled below.
    skipBlurRef.current = true;
    setSaving(true);
    try {
      await setProjectNotes(projectId, draft.trim() || null);
      setEditing(false);
      onRefetch();
    } catch (err: unknown) {
      // Save failed and edit mode stays open – allow a retry via blur.
      skipBlurRef.current = false;
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    skipBlurRef.current = true;
    setDraft(notes ?? '');
    setEditing(false);
  };

  return (
    <section className="pct-wrapper">
      <div className={containerCls}>
        <div className={headerStripCls}>
          <div className="flex items-center justify-between gap-3">
            <Text as="span" size="xs" weight="medium" uppercase color="muted">
              Bemerkungen
            </Text>
            {editing ? (
              <Text as="span" size="xs" color="muted">
                Strg/⌘+Enter oder Klick außerhalb speichert · Esc verwirft
              </Text>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  skipBlurRef.current = false;
                  setEditing(true);
                }}
              >
                Bearbeiten
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          {editing ? (
            <Textarea
              autoFocus
              value={draft}
              rows={8}
              disabled={saving}
              aria-label="Bemerkungen (Markdown)"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (skipBlurRef.current) {
                  skipBlurRef.current = false;
                  return;
                }
                void save();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancel();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void save();
                }
              }}
            />
          ) : notes ? (
            <Markdown>{notes}</Markdown>
          ) : (
            <Text as="span" size="sm" color="muted">Keine Bemerkungen vorhanden.</Text>
          )}
        </div>
      </div>
    </section>
  );
}
