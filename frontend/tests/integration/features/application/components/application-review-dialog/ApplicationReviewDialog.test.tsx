import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ApplicationReviewDialog from '@src/features/application/components/application-review-dialog/ApplicationReviewDialog';

import { renderWithProviders } from '../../../integrationTestUtils';

import type { UseApplicationFlowResult } from '@src/features/application/hooks/useApplicationFlow';
import type {
  ApplicationCommunicationOut,
  ApplicationSubmissionDetailOut,
} from '@src/features/application/services/applicationService';

const SUBMISSION: ApplicationSubmissionDetailOut = {
  id: 1,
  projectId: 1,
  projectTitle: 'Senior Fullstack Developer',
  senderProfileId: 1,
  subject: 'Bewerbung: Senior Fullstack Developer',
  body: 'Sehr geehrte Damen und Herren, fixture body.',
  language: 'de',
  senderEmail: 'me@example.com',
  replyToEmail: null,
  recipientEmail: 'contact@example.com',
  recipientDisplayName: 'Alex Beispiel',
  recipientCompanyName: 'Example GmbH',
  recipientPersonId: 1,
  recipientCompanyId: 1,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  status: { name: 'draft', slug: 'draft', category: 'application', colorToken: 'gray' },
  isCurrent: true,
  documents: [],
  communications: [],
};

const OUTBOUND: ApplicationCommunicationOut = {
  id: 1,
  applicationSubmissionId: 1,
  type: 'email',
  direction: 'outbound',
  subject: 'Bewerbung',
  date: '2026-10-01',
  summary: null,
  outcome: null,
  nextSteps: null,
  followUpDate: null,
  followUpDone: false,
  sentiment: null,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  tags: [],
};

/** Builds a fully wired flow result the dialog can render. */
function makeFlow(
  overrides: Partial<UseApplicationFlowResult> = {},
): UseApplicationFlowResult {
  return {
    submission: SUBMISSION,
    applications: [],
    loading: false,
    preparing: false,
    sending: false,
    regenerating: false,
    error: null,
    language: 'de',
    setLanguage: vi.fn(),
    refetch: vi.fn(),
    prepare: vi.fn(async () => undefined),
    send: vi.fn(async () => true),
    regenerateCv: vi.fn(async () => true),
    setCurrent: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('ApplicationReviewDialog', () => {
  it('shows recipient, subject and the mail text', () => {
    renderWithProviders(
      <ApplicationReviewDialog open onOpenChange={vi.fn()} flow={makeFlow()} />,
    );

    expect(
      screen.getByText(/Alex Beispiel · contact@example.com · Example GmbH/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bewerbung: Senior Fullstack Developer'),
    ).toBeInTheDocument();
    expect(screen.getByText(/fixture body/)).toBeInTheDocument();
  });

  it('offers the prepare action when no submission exists yet', () => {
    const flow = makeFlow({ submission: null });
    renderWithProviders(
      <ApplicationReviewDialog open onOpenChange={vi.fn()} flow={flow} />,
    );

    expect(
      screen.getByText('Für dieses Projekt gibt es noch keinen Bewerbungsvorgang.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bewerbung vorbereiten' }));

    expect(flow.prepare).toHaveBeenCalledTimes(1);
  });

  it('sends the first application without confirmation', () => {
    const flow = makeFlow();
    renderWithProviders(
      <ApplicationReviewDialog open onOpenChange={vi.fn()} flow={flow} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));

    expect(flow.send).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before sending again', async () => {
    const flow = makeFlow({
      submission: { ...SUBMISSION, communications: [OUTBOUND] },
    });
    renderWithProviders(
      <ApplicationReviewDialog open onOpenChange={vi.fn()} flow={flow} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Erneut senden' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Bewerbung erneut senden?',
    });
    expect(flow.send).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Erneut senden' }));

    expect(flow.send).toHaveBeenCalledTimes(1);
  });

  it('shows the loading state while the submission is fetched', () => {
    renderWithProviders(
      <ApplicationReviewDialog
        open
        onOpenChange={vi.fn()}
        flow={makeFlow({ loading: true })}
      />,
    );

    expect(screen.getByText('Lade Vorgang …')).toBeInTheDocument();
  });

  it('shows the CV empty state without a rendered document', () => {
    renderWithProviders(
      <ApplicationReviewDialog open onOpenChange={vi.fn()} flow={makeFlow()} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'CV' }));

    expect(screen.getByText('Keine CV-Vorschau verfügbar.')).toBeInTheDocument();
  });
});
