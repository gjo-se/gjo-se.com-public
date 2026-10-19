import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeleteConfirmDialog } from '@src/components/table/DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(
      <DeleteConfirmDialog
        open
        title="Eintrag löschen"
        description="Wirklich löschen?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Eintrag löschen')).toBeVisible();
    expect(screen.getByText('Wirklich löschen?')).toBeVisible();
  });

  it('offers the destructive delete label', async () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Eintrag löschen"
        description="Wirklich löschen?"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels through the ghost button', async () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Eintrag löschen"
        description="Wirklich löschen?"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
