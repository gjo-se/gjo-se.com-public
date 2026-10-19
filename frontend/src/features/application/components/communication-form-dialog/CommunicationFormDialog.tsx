/**
 * CommunicationFormDialog – dialog form to create/edit an application communication.
 *
 * Collects type, direction, subject, summary, outcome, next steps, follow-up
 * date/done, sentiment and tags, then delegates persistence to `onSubmit`.
 * With `entry` set the dialog switches to edit mode (prefilled) and offers a
 * destructive delete via `onDelete`. Pure presentation: no API access – the
 * parent supplies the submit/delete handlers.
 */
import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useState } from 'react';

import Dropdown, {
  type DropdownItem,
} from '@src/components/molecules/Dropdown/Dropdown';
import TagPicker from '@src/components/organisms/TagPicker/TagPicker';
import Button from '@src/components/primitives/Button';
import Checkbox from '@src/components/primitives/Checkbox';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import Textarea from '@src/components/primitives/Textarea';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';

import FieldLabel from './FieldLabel';
import Section from './Section';

import type {
  ApplicationCommunicationCreate,
  ApplicationCommunicationOut,
} from '../../services/applicationService';

export interface CommunicationFormDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Called when the dialog should open/close. */
  onOpenChange: (open: boolean) => void;
  /**
   * Existing entry to edit (prefilled). Omit/`null` to create a new entry.
   */
  entry?: ApplicationCommunicationOut | null;
  /** Persists the entry; rejects on failure. */
  onSubmit: (body: ApplicationCommunicationCreate) => Promise<void>;
  /** Optional delete handler – shows the destructive action in edit mode. */
  onDelete?: (entry: ApplicationCommunicationOut) => Promise<void>;
  /** Marks the entry as automatically logged (e.g. the send record). */
  isSystem?: boolean;
  /** Optional external submit flag (in addition to the internal one). */
  submitting?: boolean;
}

const TYPE_ITEMS: DropdownItem[] = [
  { value: 'note', label: 'Notiz' },
  { value: 'call', label: 'Anruf' },
  { value: 'email', label: 'E-Mail' },
  { value: 'meeting', label: 'Meeting' },
];

const DIRECTION_ITEMS: DropdownItem[] = [
  { value: 'outbound', label: 'Ausgehend' },
  { value: 'inbound', label: 'Eingehend' },
  { value: 'internal', label: 'Intern' },
];

const OUTCOME_ITEMS: DropdownItem[] = [
  { value: 'positive', label: 'Positiv' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negativ' },
  { value: 'no_answer', label: 'Keine Antwort' },
  { value: 'follow_up_needed', label: 'Wiedervorlage nötig' },
];

const SENTIMENT_ITEMS: DropdownItem[] = [
  { value: 'positive', label: 'Positiv' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negativ' },
];

/** Scrollfläche des Dialogs – Body (2xl) und Textfeld (Zusammenfassung). */
const scrollPaneVariants = cva('', {
  variants: {
    area: {
      body: 'max-h-half-viewport overflow-y-auto pr-1',
      field: 'max-h-56 overflow-y-auto',
    },
  },
});

/**
 * Dialog form that creates a new communication entry or edits an existing one
 * (note/call/answer incl. follow-up, tags, delete).
 */
export default function CommunicationFormDialog({
  open,
  onOpenChange,
  entry = null,
  onSubmit,
  onDelete,
  isSystem = false,
  submitting = false,
}: CommunicationFormDialogProps) {
  const isEdit = entry !== null;

  const [type, setType] = useState('note');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDone, setFollowUpDone] = useState(false);
  const [sentiment, setSentiment] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset/prefill the form whenever the dialog opens (or the entry changes).
  useEffect(() => {
    if (!open) return;
    if (entry) {
      setType(entry.type);
      setDirection(entry.direction);
      setSubject(entry.subject ?? '');
      setSummary(entry.summary ?? '');
      setOutcome(entry.outcome ?? '');
      setNextSteps(entry.nextSteps ?? '');
      setFollowUpDate(toDateInputValue(entry.followUpDate));
      setFollowUpDone(entry.followUpDone);
      setSentiment(entry.sentiment ?? '');
      setSelectedTagIds(entry.tags.map((tag) => tag.id));
    } else {
      setType('note');
      setDirection('outbound');
      setSubject('');
      setSummary('');
      setOutcome('');
      setNextSteps('');
      setFollowUpDate('');
      setFollowUpDone(false);
      setSentiment('');
      setSelectedTagIds([]);
    }
    setConfirmDelete(false);
  }, [open, entry]);

  const busy = submitting || saving;
  const canSubmit =
    (subject.trim().length > 0 || summary.trim().length > 0) && !busy;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({
        type,
        direction,
        subject: subject.trim() || null,
        summary: summary.trim() || null,
        outcome: outcome || null,
        next_steps: nextSteps.trim() || null,
        follow_up_date: followUpDate || null,
        follow_up_done: followUpDone,
        sentiment: sentiment || null,
        tag_ids: selectedTagIds,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      showErrorToast(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }, [
    canSubmit,
    onSubmit,
    onOpenChange,
    type,
    direction,
    subject,
    summary,
    outcome,
    nextSteps,
    followUpDate,
    followUpDone,
    sentiment,
    selectedTagIds,
  ]);

  const handleDelete = useCallback(async () => {
    if (!onDelete || !entry) return;
    setDeleting(true);
    try {
      await onDelete(entry);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err: unknown) {
      showErrorToast(extractApiError(err));
    } finally {
      setDeleting(false);
    }
  }, [onDelete, entry, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Eintrag bearbeiten' : 'Verlaufseintrag'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Notiz, Anruf oder Antwort anpassen – inkl. Wiedervorlage und Tags.'
                : 'Notiz, Anruf oder Antwort protokollieren – inkl. Wiedervorlage und Tags.'}
            </DialogDescription>
          </DialogHeader>

          {isSystem && (
            <Text as="p" size="sm" color="muted">
              Automatisch protokolliert beim Versand.
            </Text>
          )}

          <div className={scrollPaneVariants({ area: 'body' })}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
              <Section title="Inhalt">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Betreff</FieldLabel>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Betreff des Eintrags"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <FieldLabel>Zusammenfassung</FieldLabel>
                  <div className={scrollPaneVariants({ area: 'field' })}>
                    <Textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Kurze Zusammenfassung"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <FieldLabel>Nächste Schritte</FieldLabel>
                  <Textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="Was sind die nächsten konkreten Schritte?"
                    rows={3}
                  />
                </div>
              </Section>

              <div className="flex flex-col gap-4">
                <Section title="Kanal">
                  <div className="flex flex-col gap-1">
                    <FieldLabel>Typ</FieldLabel>
                    <Dropdown
                      items={TYPE_ITEMS}
                      selectedValue={type}
                      onSelect={setType}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <FieldLabel>Richtung</FieldLabel>
                    <Dropdown
                      items={DIRECTION_ITEMS}
                      selectedValue={direction}
                      onSelect={setDirection}
                    />
                  </div>
                </Section>

                <Section title="Status">
                  <div className="flex flex-col gap-1">
                    <FieldLabel>Ergebnis</FieldLabel>
                    <Dropdown
                      items={OUTCOME_ITEMS}
                      selectedValue={outcome}
                      onSelect={setOutcome}
                      placeholder="Keine Angabe"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <FieldLabel>Sentiment</FieldLabel>
                    <Dropdown
                      items={SENTIMENT_ITEMS}
                      selectedValue={sentiment}
                      onSelect={setSentiment}
                      placeholder="Keine Angabe"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <FieldLabel>Wiedervorlage</FieldLabel>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={followUpDone}
                      onChange={setFollowUpDone}
                      label="Wiedervorlage erledigt"
                    />
                  </div>
                </Section>

                <Section title="Tags">
                  <TagPicker
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                    taggableType="application_communication"
                    showCreate={false}
                  />
                </Section>
              </div>
            </div>
          </div>

          <DialogFooter>
            {isEdit && onDelete && (
              <div className="sm:mr-auto">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  Löschen
                </Button>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={busy}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eintrag löschen</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Diesen Verlaufseintrag endgültig löschen?
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Lädt…' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Trims an ISO datetime to the `YYYY-MM-DD` a date input needs. */
function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}
