import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationsTab } from '@src/features/viscera/viewer/components/detail-tabs/AnnotationsTab';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Annotation } from '@src/features/viscera/core/workspaceSchema';

const ANNOTATIONS: Annotation[] = [
  { text: 'Erste Notiz', author: 'Greg', date: '2026-01-01' },
  { text: 'Zweite Notiz', author: 'Anna', date: '2026-01-02' },
];

function tabProps(overrides: Partial<Parameters<typeof AnnotationsTab>[0]> = {}) {
  return {
    annotations: ANNOTATIONS,
    editingIndex: null,
    editText: '',
    newAnnotationText: '',
    isSaving: false,
    onAdd: vi.fn(),
    onStartEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDelete: vi.fn(),
    onNewTextChange: vi.fn(),
    ...overrides,
  };
}

describe('AnnotationsTab', () => {
  it('shows an empty hint without annotations', () => {
    renderWithWorkspace(<AnnotationsTab {...tabProps({ annotations: [] })} />);

    expect(screen.getByText('Keine Annotationen vorhanden')).toBeInTheDocument();
  });

  it('lists annotations with their author', () => {
    renderWithWorkspace(<AnnotationsTab {...tabProps()} />);

    expect(screen.getByText('Erste Notiz')).toBeInTheDocument();
    expect(screen.getByText('Greg')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
  });

  it('routes edit and delete actions with the row index', () => {
    const props = tabProps();
    renderWithWorkspace(<AnnotationsTab {...props} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]!);
    fireEvent.click(screen.getAllByRole('button', { name: '×' })[0]!);

    expect(props.onStartEdit).toHaveBeenCalledWith(1);
    expect(props.onDelete).toHaveBeenCalledWith(0);
  });

  it('switches the editing row into the inline editor', () => {
    renderWithWorkspace(<AnnotationsTab {...tabProps({ editingIndex: 0, editText: 'Erste Notiz' })} />);

    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Erste Notiz');
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('disables adding an empty annotation', () => {
    renderWithWorkspace(<AnnotationsTab {...tabProps()} />);

    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();
  });
});
