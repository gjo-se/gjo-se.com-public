import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConfirmDialog from '@src/components/molecules/ConfirmDialog/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the confirmation content when open', () => {
    render(
      <ConfirmDialog
        open
        title="Projekt löschen"
        description="Dieser Vorgang kann nicht widerrufen werden."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText('Projekt löschen')).toBeVisible();
    expect(screen.getByText('Dieser Vorgang kann nicht widerrufen werden.')).toBeVisible();
  });

  it('does not render the dialog when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Projekt löschen"
        description="Beschreibung"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invokes the confirm callback', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Projekt löschen"
        description="Beschreibung"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        confirmLabel="Löschen"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('invokes the cancel callback with the default label', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Projekt löschen"
        description="Beschreibung"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
