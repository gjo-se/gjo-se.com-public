/**
 * ApplicationReviewDialog – read-only review of an application submission.
 *
 * Shows the recipient and the subject line, and the plain-text mail
 * (default tab) and the CV as read-only tabs, plus the
 * send action. The whole snapshot is read-only: subject and body are generated
 * from the project (role) and the application profile data, so changes belong
 * in the generator (role: `project.title_normalized`). Once the submission has
 * been sent at least once, a resend requires an explicit confirmation dialog.
 */
import { cva } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import AlertDialog from '@src/components/primitives/AlertDialog';
import Button from '@src/components/primitives/Button';
import Checkbox from '@src/components/primitives/Checkbox';
import Chip from '@src/components/primitives/Chip';
import Dialog, {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import NativeSelect from '@src/components/primitives/NativeSelect';
import NativeSelectOption from '@src/components/primitives/NativeSelect/NativeSelectOption';
import Spinner from '@src/components/primitives/Spinner';
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@src/components/primitives/Tabs';
import Text from '@src/components/primitives/Text';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';

import { getApplicationDocumentBlob } from '../../services/applicationService';
import { buildResendDescription } from '../../utils/resendDescription';

import ApplicationVersionBar from './ApplicationVersionBar';

import type { UseApplicationFlowResult } from '../../hooks/useApplicationFlow';
import type { Language } from '../../services/applicationService';

export interface ApplicationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: UseApplicationFlowResult;
}

const mailBodyVariants = cva(
  'h-half-viewport overflow-y-auto rounded-md border border-border bg-surface p-4 whitespace-pre-wrap',
);

const cvPaneVariants = cva('flex h-half-viewport flex-col gap-2');

/** CV document descriptor used by the review pane. */
type CvDocument = SubmissionDocument | null;

/** All read-only, submission-derived values the review dialog renders. */
interface ReviewState {
  cvDoc: CvDocument;
  cvDocId: number | undefined;
  storedDefaultSkills: boolean;
  statusName: string | null;
  isSent: boolean;
  recipientLine: string;
  recipientName: string;
  outboundCount: number;
  hasSentBefore: boolean;
  lastSentAt: string | null;
}

/** A submission document as returned by the application flow. */
type SubmissionDocument = NonNullable<UseApplicationFlowResult['submission']>['documents'][number];

/**
 * Dialog for reviewing the recipient, the rendered mail and the CV before
 * sending the application submission of a project.
 */
export default function ApplicationReviewDialog({
  open,
  onOpenChange,
  flow,
}: ApplicationReviewDialogProps) {
  const submission = flow.submission;
  const [confirmResendOpen, setConfirmResendOpen] = useState(false);
  const [sendSucceeded, setSendSucceeded] = useState(false);

  const review = deriveReviewState(submission);
  const cvUrl = useCvObjectUrl(open, review.cvDocId);

  // Skill mode for the CV: defaults to the mode stored on the loaded snapshot
  // (project vs. curated default skills); a local toggle wins for the current
  // document until the submission reloads with a fresh snapshot.
  const [defaultSkillsChoice, setDefaultSkillsChoice] = useState<{
    docId: number | undefined;
    value: boolean;
  }>({ docId: undefined, value: false });
  const useDefaultSkills =
    defaultSkillsChoice.docId === review.cvDocId
      ? defaultSkillsChoice.value
      : review.storedDefaultSkills;
  const setUseDefaultSkills = (value: boolean) =>
    setDefaultSkillsChoice({ docId: review.cvDocId, value });

  const resendDescription = buildResendDescription(
    review.outboundCount,
    review.lastSentAt,
    review.recipientName,
  );

  const doSend = async () => {
    setSendSucceeded(false);
    const ok = await flow.send();
    if (ok) setSendSucceeded(true);
  };

  // Reset transient send feedback and the confirmation whenever the dialog closes.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSendSucceeded(false);
      setConfirmResendOpen(false);
    }
    onOpenChange(nextOpen);
  };

  // First send goes straight out; any later send needs an explicit confirmation.
  const handleSendClick = () => {
    if (review.hasSentBefore) {
      setConfirmResendOpen(true);
    } else {
      void doSend();
    }
  };

  const handleRegenerateCv = async () => {
    const ok = await flow.regenerateCv(useDefaultSkills);
    if (ok) toast.success('CV neu erzeugt.');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle>Bewerbung prüfen</DialogTitle>
        </DialogHeader>

        {flow.loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Spinner />
            <Text as="span" size="sm" color="muted">
              Lade Vorgang …
            </Text>
          </div>
        ) : submission === null ? (
          <div className="flex flex-col gap-3 py-2">
            <Text as="span" size="sm" color="muted">
              Für dieses Projekt gibt es noch keinen Bewerbungsvorgang.
            </Text>
            <div className="flex flex-col gap-1">
              <Text as="span" size="sm" weight="medium" color="muted">
                Sprache der Bewerbung
              </Text>
              <NativeSelect
                size="sm"
                value={flow.language}
                onChange={(event) => flow.setLanguage(event.target.value as Language)}
                disabled={flow.preparing}
              >
                <NativeSelectOption value="de">Deutsch</NativeSelectOption>
                <NativeSelectOption value="en">English</NativeSelectOption>
              </NativeSelect>
            </div>
            <Button
              onClick={() => void flow.prepare()}
              disabled={flow.preparing}
            >
              {flow.preparing ? 'Wird vorbereitet …' : 'Bewerbung vorbereiten'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ApplicationVersionBar
              applications={flow.applications}
              currentId={submission.id}
              language={flow.language}
              preparing={flow.preparing}
              onSelect={(id) => void flow.setCurrent(id)}
              onLanguageChange={flow.setLanguage}
              onPrepareNew={() => void flow.prepare()}
            />

            <div className="flex flex-col gap-2">
              <Text as="span" size="sm">
                <Text as="span" size="sm" weight="medium" color="muted">
                  An:{' '}
                </Text>
                {review.recipientLine}
              </Text>
              <Text as="span" size="sm">
                <Text as="span" size="sm" weight="medium" color="muted">
                  Betreff:{' '}
                </Text>
                {submission.subject}
              </Text>
              <div className="flex">
                <Chip variant="info" size="sm">
                  {submission.language.toUpperCase()}
                </Chip>
              </div>
            </div>

            <Tabs defaultValue="text">
              <TabsList>
                <TabsTrigger value="text">Text-Mail</TabsTrigger>
                <TabsTrigger value="cv">CV</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <div className={mailBodyVariants()}>
                  <Text as="pre" size="sm">
                    {submission.body}
                  </Text>
                </div>
              </TabsContent>

              <TabsContent value="cv">
                <div className={cvPaneVariants()}>
                  <div className="flex shrink-0 items-center justify-end gap-3">
                    <div className="mr-auto flex items-center">
                      <Checkbox
                        size="sm"
                        label="Default-Skills verwenden"
                        checked={useDefaultSkills}
                        onChange={setUseDefaultSkills}
                        disabled={flow.regenerating}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRegenerateCv()}
                      disabled={flow.regenerating}
                      loading={flow.regenerating}
                    >
                      CV neu erzeugen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void downloadCv(review.cvDoc, cvUrl)}
                      disabled={!review.cvDoc}
                    >
                      CV herunterladen
                    </Button>
                  </div>
                  {cvUrl && review.cvDoc ? (
                    <iframe
                      title="CV-Vorschau"
                      src={cvUrl}
                      className="min-h-0 w-full flex-1 rounded-md border border-border"
                    />
                  ) : (
                    <Text as="span" size="xs" color="muted">
                      Keine CV-Vorschau verfügbar.
                    </Text>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!flow.loading && flow.error && (
          <Text color="error" size="sm">
            {flow.error}
          </Text>
        )}

        <DialogFooter>
          <div className="flex items-center gap-2 sm:mr-auto">
            {review.statusName && (
              <Chip variant={review.isSent ? 'success' : 'info'} size="sm">
                {review.statusName}
              </Chip>
            )}
            {flow.sending && (
              <>
                <Spinner />
                <Text as="span" size="sm" color="muted">
                  Wird gesendet …
                </Text>
              </>
            )}
            {sendSucceeded && !flow.sending && (
              <Text as="span" size="sm" color="success">
                Bewerbung gesendet.
              </Text>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </Button>
          {submission !== null && !flow.loading && (
            <Button
              onClick={handleSendClick}
              disabled={flow.sending}
              loading={flow.sending}
            >
              {review.hasSentBefore ? 'Erneut senden' : 'Senden'}
            </Button>
          )}
        </DialogFooter>

        <AlertDialog
          open={confirmResendOpen}
          onOpenChange={setConfirmResendOpen}
          title="Bewerbung erneut senden?"
          description={resendDescription}
          cancelLabel="Abbrechen"
          confirmLabel="Erneut senden"
          onConfirm={() => void doSend()}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Derives the (nullable-safe) review state from the current submission. */
function deriveReviewState(submission: UseApplicationFlowResult['submission']): ReviewState {
  const cvDoc: CvDocument = submission?.documents.find((doc) => doc.kind === 'cv') ?? null;
  const statusName = submission?.status?.name ?? null;
  const recipientLine = [
    submission?.recipientDisplayName,
    submission?.recipientEmail,
    submission?.recipientCompanyName,
  ]
    .filter(Boolean)
    .join(' · ');
  const outboundSends = (submission?.communications ?? []).filter(
    (c) => c.type === 'email' && c.direction === 'outbound',
  );
  const lastSentAt = outboundSends.reduce<string | null>(
    (latest, c) => (latest === null || c.date > latest ? c.date : latest),
    null,
  );

  return {
    cvDoc,
    cvDocId: cvDoc?.id,
    storedDefaultSkills: cvDoc?.renderContext?.['use_default_skills'] === true,
    statusName,
    isSent: statusName === 'sent',
    recipientLine,
    recipientName: submission?.recipientDisplayName ?? submission?.recipientEmail ?? '',
    outboundCount: outboundSends.length,
    hasSentBefore: outboundSends.length > 0,
    lastSentAt,
  };
}

/** Triggers a browser download of the CV (reusing the cached URL when present). */
async function downloadCv(cvDoc: CvDocument, cvUrl: string | null): Promise<void> {
  if (!cvDoc) return;
  try {
    const url = cvUrl ?? URL.createObjectURL(await getApplicationDocumentBlob(cvDoc.id));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = cvDoc.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    if (!cvUrl) URL.revokeObjectURL(url);
  } catch (err: unknown) {
    showErrorToast(`CV-Download fehlgeschlagen: ${extractApiError(err)}`);
  }
}

/**
 * Lazily loads the CV blob into an Object URL (revoked on cleanup / doc change).
 *
 * @param open Whether the dialog is open (loading is skipped while closed).
 * @param cvDocId The CV document id (undefined while none is loaded).
 * @returns The current Object URL or null while unavailable.
 */
function useCvObjectUrl(open: boolean, cvDocId: number | undefined): string | null {
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || cvDocId === undefined) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const blob = await getApplicationDocumentBlob(cvDocId);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCvUrl(objectUrl);
      } catch {
        if (!cancelled) setCvUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, cvDocId]);

  return cvUrl;
}
