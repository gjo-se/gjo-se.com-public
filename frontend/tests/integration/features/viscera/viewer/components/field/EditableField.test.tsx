import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditableField } from '@src/features/viscera/viewer/components/field/EditableField';

import type { WriteResult } from '@src/features/viscera/viewer/hooks/useYamlWrite';

function renderField(overrides: Partial<Parameters<typeof EditableField>[0]> = {}) {
  const props = {
    value: 'Backend',
    field: 'name',
    objectId: 'backend',
    onSave: vi.fn(async (): Promise<WriteResult> => ({ success: true })),
    ...overrides,
  };
  const view = render(<EditableField {...props} />);
  return { props, view };
}

describe('EditableField', () => {
  it('shows the value and enters edit mode on click', () => {
    renderField();

    fireEvent.click(screen.getByRole('button', { name: /Backend/ }));

    expect(screen.getByRole('textbox')).toHaveValue('Backend');
  });

  it('saves the changed value on Enter and shows the saved feedback', async () => {
    const { props } = renderField();

    fireEvent.click(screen.getByRole('button', { name: /Backend/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Backend API' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() =>
      expect(props.onSave).toHaveBeenCalledWith('backend', 'name', 'Backend API'),
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('keeps the field open and shows the error when saving fails', async () => {
    const { props } = renderField({
      onSave: vi.fn(async (): Promise<WriteResult> => ({
        success: false,
        error: 'Schreibfehler',
      })),
    });

    fireEvent.click(screen.getByRole('button', { name: /Backend/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Anders' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(await screen.findByText('Schreibfehler')).toBeInTheDocument();
  });

  it('cancels with Escape without saving', () => {
    const { props } = renderField();

    fireEvent.click(screen.getByRole('button', { name: /Backend/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Verworfen' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(screen.getByRole('button', { name: /Backend/ })).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('uses a placeholder for empty values and shows the inline validation error', () => {
    renderField({ value: '', error: 'Name ist erforderlich' });

    expect(screen.getByRole('button', { name: /—/ })).toBeInTheDocument();
    expect(screen.getByText(/Name ist erforderlich/)).toBeInTheDocument();
  });
});
