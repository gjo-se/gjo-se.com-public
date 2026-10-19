import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CreateObjectDialog from '@src/features/viscera/viewer/components/dialog/CreateObjectDialog';

import { renderWithWorkspace } from '../../../visceraTestUtils';

describe('CreateObjectDialog', () => {
  it('requires a valid id and a name before submitting', () => {
    renderWithWorkspace(
      <CreateObjectDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Objekt erstellen' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('ID *'), { target: { value: '1 invalid' } });
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Service' } });

    expect(
      screen.getByText(/ID-Format: dot-separated/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objekt erstellen' })).toBeDisabled();
  });

  it('creates an object with trimmed values', () => {
    const onCreated = vi.fn();
    renderWithWorkspace(
      <CreateObjectDialog open onOpenChange={vi.fn()} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByLabelText('ID *'), { target: { value: 'backend.auth' } });
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '  Auth Service  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Objekt erstellen' }));

    expect(onCreated).toHaveBeenCalledWith({
      id: 'backend.auth',
      name: 'Auth Service',
      type: 'System',
      description: null,
      parent: undefined,
    });
  });

  it('enforces the parent prefix for prefilled creations', () => {
    renderWithWorkspace(
      <CreateObjectDialog
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        prefill={{ parent: 'backend', type: 'Container' }}
      />,
    );

    const idInput = screen.getByLabelText('ID *');
    fireEvent.change(idInput, { target: { value: 'auth' } });

    expect(idInput).toHaveValue('backend.');
    expect(screen.getByText('Neue Container erstellen')).toBeInTheDocument();
  });

  it('shows a passed server error', () => {
    renderWithWorkspace(
      <CreateObjectDialog
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        error="Objekt existiert bereits"
      />,
    );

    expect(screen.getByText('Objekt existiert bereits')).toBeInTheDocument();
  });
});
