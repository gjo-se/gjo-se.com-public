import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CommunicationFormDialog from '@src/features/application/components/communication-form-dialog/CommunicationFormDialog';

import type { ApplicationCommunicationOut } from '@src/features/application/services/applicationService';

const ENTRY: ApplicationCommunicationOut = {
  id: 1,
  applicationSubmissionId: 1,
  type: 'call',
  direction: 'inbound',
  subject: 'Rückruf',
  date: '2026-10-01',
  summary: 'Kurzes Telefonat.',
  outcome: null,
  nextSteps: null,
  followUpDate: null,
  followUpDone: false,
  sentiment: null,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  tags: [],
};

/** Renders the dialog in create mode. */
function renderCreate(onSubmit = vi.fn(async () => undefined)) {
  return render(
    <CommunicationFormDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />,
  );
}

describe('CommunicationFormDialog', () => {
  it('keeps the submit disabled until a subject or summary is entered', () => {
    renderCreate();

    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Betreff des Eintrags'), {
      target: { value: 'Neuer Eintrag' },
    });

    expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
  });

  it('submits the typed content', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderCreate(onSubmit);

    fireEvent.change(screen.getByPlaceholderText('Betreff des Eintrags'), {
      target: { value: 'Neuer Eintrag' },
    });
    fireEvent.change(screen.getByPlaceholderText('Kurze Zusammenfassung'), {
      target: { value: 'Zusammenfassung' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'note',
        direction: 'outbound',
        subject: 'Neuer Eintrag',
        summary: 'Zusammenfassung',
      }),
    );
  });

  it('prefills the form in edit mode and saves the changes', () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <CommunicationFormDialog
        open
        onOpenChange={vi.fn()}
        entry={ENTRY}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Eintrag bearbeiten')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rückruf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'call', direction: 'inbound', subject: 'Rückruf' }),
    );
  });

  it('deletes an existing entry after confirmation', async () => {
    const onDelete = vi.fn(async () => undefined);
    render(
      <CommunicationFormDialog
        open
        onOpenChange={vi.fn()}
        entry={ENTRY}
        onSubmit={vi.fn(async () => undefined)}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eintrag löschen' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith(ENTRY);
  });

  it('flags automatically logged entries', () => {
    render(
      <CommunicationFormDialog
        open
        onOpenChange={vi.fn()}
        entry={ENTRY}
        onSubmit={vi.fn(async () => undefined)}
        isSystem
      />,
    );

    expect(
      screen.getByText('Automatisch protokolliert beim Versand.'),
    ).toBeInTheDocument();
  });
});
