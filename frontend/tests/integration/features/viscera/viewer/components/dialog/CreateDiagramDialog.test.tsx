import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import CreateDiagramDialog from '@src/features/viscera/viewer/components/dialog/CreateDiagramDialog';

import { makeDiagram, renderWithWorkspace } from '../../../visceraTestUtils';

describe('CreateDiagramDialog', () => {
  it('derives the key from the entered name', () => {
    renderWithWorkspace(
      <CreateDiagramDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'Monitoring Dashboard' },
    });

    expect(screen.getByText('MonitoringDashboard')).toBeInTheDocument();
  });

  it('creates a diagram with the derived key', async () => {
    const onCreated = vi.fn().mockResolvedValue(undefined);
    renderWithWorkspace(
      <CreateDiagramDialog open onOpenChange={vi.fn()} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'Monitoring Dashboard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Diagramm erstellen' }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        key: 'MonitoringDashboard',
        name: 'Monitoring Dashboard',
        type: 'systemContext',
        description: null,
        parent: null,
        layout: 'lr',
      }),
    );
  });

  it('prefills edit mode and keeps the persisted key', async () => {
    const onEdited = vi.fn().mockResolvedValue(undefined);

    function EditHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Dialog öffnen
          </button>
          <CreateDiagramDialog
            open={open}
            onOpenChange={setOpen}
            onCreated={vi.fn()}
            onEdited={onEdited}
            diagram={makeDiagram({ key: 'system-context', name: 'System Context' })}
          />
        </>
      );
    }

    renderWithWorkspace(<EditHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Dialog öffnen' }));

    expect(screen.getByText('Diagramm bearbeiten')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toHaveValue('System Context');

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(onEdited).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'system-context', name: 'System Context' }),
      ),
    );
  });

  it('shows the server error and blocks submitting while busy', () => {
    renderWithWorkspace(
      <CreateDiagramDialog
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        isSubmitting
        error="Key existiert bereits"
      />,
    );

    expect(screen.getByText('Key existiert bereits')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichere…' })).toBeDisabled();
  });
});
