import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationEditor } from '@src/features/viscera/viewer/components/detail-tabs/AnnotationEditor';

import { renderWithWorkspace } from '../../../visceraTestUtils';

describe('AnnotationEditor', () => {
  it('prefills the current annotation text', () => {
    renderWithWorkspace(
      <AnnotationEditor
        initialText="Alter Text"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('Alter Text');
  });

  it('saves the trimmed text on enter', () => {
    const onSave = vi.fn();
    renderWithWorkspace(
      <AnnotationEditor
        initialText="Alter Text"
        onSave={onSave}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '  Neuer Text  ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSave).toHaveBeenCalledWith('Neuer Text');
  });

  it('cancels on escape', () => {
    const onCancel = vi.fn();
    renderWithWorkspace(
      <AnnotationEditor
        initialText="Alter Text"
        onSave={vi.fn()}
        onCancel={onCancel}
        isSaving={false}
      />,
    );

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables saving for blank text', () => {
    renderWithWorkspace(
      <AnnotationEditor
        initialText="Alter Text"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });
});
