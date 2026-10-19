import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ApplicationTimeline from '@src/features/application/components/application-timeline/ApplicationTimeline';

import type { ApplicationCommunicationOut } from '@src/features/application/services/applicationService';

/** Builds one communication entry with sane defaults. */
function makeEntry(overrides: Partial<ApplicationCommunicationOut> = {}): ApplicationCommunicationOut {
  return {
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
    ...overrides,
  };
}

describe('ApplicationTimeline', () => {
  it('renders the empty state without entries', () => {
    render(<ApplicationTimeline communications={[]} />);

    expect(screen.getByRole('heading', { name: 'Verlauf' })).toBeInTheDocument();
    expect(screen.getByText('Noch kein Verlauf')).toBeInTheDocument();
  });

  it('renders type, direction, outcome and follow-up labels', () => {
    render(
      <ApplicationTimeline
        communications={[
          makeEntry({
            type: 'call',
            direction: 'inbound',
            subject: 'Rückruf',
            outcome: 'positive',
            followUpDate: '2026-10-05',
          }),
        ]}
      />,
    );

    expect(screen.getByText('Anruf')).toBeInTheDocument();
    expect(screen.getByText('Eingehend')).toBeInTheDocument();
    expect(screen.getByText('Positiv')).toBeInTheDocument();
    expect(screen.getByText(/WV /)).toBeInTheDocument();
    expect(screen.getByText('Rückruf')).toBeInTheDocument();
  });

  it('sorts the entries newest first', () => {
    render(
      <ApplicationTimeline
        communications={[
          makeEntry({ id: 1, date: '2026-09-01', subject: 'Alter Eintrag' }),
          makeEntry({ id: 2, date: '2026-10-01', subject: 'Neuer Eintrag' }),
        ]}
      />,
    );

    const newer = screen.getByText('Neuer Eintrag');
    const older = screen.getByText('Alter Eintrag');
    expect(
      newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('marks automatically logged entries', () => {
    render(
      <ApplicationTimeline
        communications={[makeEntry({ id: 7 })]}
        systemEntryIds={[7]}
      />,
    );

    expect(screen.getByText('automatisch')).toBeInTheDocument();
  });

  it('reports a click on an entry', () => {
    const onEntryClick = vi.fn();
    render(
      <ApplicationTimeline
        communications={[makeEntry({ subject: 'Bewerbung' })]}
        onEntryClick={onEntryClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eintrag bearbeiten' }));

    expect(onEntryClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, subject: 'Bewerbung' }),
    );
  });

  it('renders tag chips of an entry', () => {
    render(
      <ApplicationTimeline
        communications={[
          makeEntry({ tags: [{ id: 1, name: 'kernkunde' }] }),
        ]}
      />,
    );

    expect(screen.getByText('kernkunde')).toBeInTheDocument();
  });
});
