import { cva } from 'class-variance-authority';
import { useCallback, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Text from '@src/components/primitives/Text/Text';
import { Textarea } from '@src/components/vendor/shadcn/textarea';

import type { ObjectDetail } from '../../hooks/useObjectDetail';

// ── Props ────────────────────────────────────────────────────────────────────

export interface RejectedNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The object being rejected. */
  detail: ObjectDetail;
  /** Called when the user confirms the rejection with reason and optional prompt suggestion. */
  onConfirm: (reason: string, promptSuggestion: string) => void;
  /** Whether the rejection is currently being processed. */
  isSending: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_REASON_LENGTH = 10;

const contextBoxVariants = cva(
  'rounded-md border bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50',
);

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Dialog that opens when a user rejects an LLM-generated architecture object.
 *
 * Collects a mandatory rejection reason (min. 10 chars) and an optional
 * prompt-improvement suggestion. Shows object context (name, type) for reference.
 */
export default function RejectedNoticeDialog({
  open,
  onOpenChange,
  detail,
  onConfirm,
  isSending,
}: RejectedNoticeDialogProps) {
  const [reason, setReason] = useState('');
  const [promptSuggestion, setPromptSuggestion] = useState('');

  const reasonValid = useMemo(() => reason.trim().length >= MIN_REASON_LENGTH, [reason]);

  const handleConfirm = useCallback(() => {
    if (!reasonValid || isSending) return;
    onConfirm(reason.trim(), promptSuggestion.trim());
  }, [reasonValid, isSending, reason, promptSuggestion, onConfirm]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setReason('');
    setPromptSuggestion('');
  }, [onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setReason('');
        setPromptSuggestion('');
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const objectName = detail.name || detail.objectId || 'Unbekannt';
  const objectType = detail.typeLabel || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Objekt ablehnen – Feedback an LLM</DialogTitle>
          <DialogDescription>
            Begründe die Ablehnung, damit das LLM den Prompt verbessern und das Objekt
            korrigieren kann.
          </DialogDescription>
        </DialogHeader>

        {/* Object context preview */}
        <div className={contextBoxVariants()}>
          <Text size="xs" color="muted">
            Objekt: <Text as="span" size="xs" weight="semibold">{objectName}</Text>
            {' · '}
            Typ: <Text as="span" size="xs" weight="semibold">{objectType}</Text>
          </Text>
        </div>

        {/* Rejection reason (required) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rejection-reason">
            <Text as="span" size="sm" weight="semibold">
              Begründung *
            </Text>
          </label>
          <Textarea
            id="rejection-reason"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Warum wurde dieses Objekt abgelehnt? (mind. 10 Zeichen)"
            rows={3}
          />
          <Text size="xs" color={reasonValid ? 'success' : 'muted'}>
            {reason.trim().length}/{MIN_REASON_LENGTH} Zeichen
          </Text>
        </div>

        {/* Prompt improvement suggestion (optional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prompt-suggestion">
            <Text as="span" size="sm" weight="semibold">
              Prompt-Verbesserung vorschlagen
            </Text>
            <Text as="span" size="xs" color="muted">
              {' '}(optional)
            </Text>
          </label>
          <Textarea
            id="prompt-suggestion"
            value={promptSuggestion}
            onChange={(e) => setPromptSuggestion(e.target.value)}
            placeholder="z.B. 'Das LLM soll Container statt Systeme vorschlagen'"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel} disabled={isSending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reasonValid || isSending}
          >
            {isSending ? 'Sende…' : 'Ablehnung bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
