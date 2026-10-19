import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import YamlEditorToolbar from '@src/features/viscera/editor/components/editor/YamlEditorToolbar';

import { renderWithWorkspace } from '../../../visceraTestUtils';

const FILES = [
  { label: 'workspace.yml', path: '/architecture/workspace.yml' },
  { label: 'backend.yml', path: '/architecture/nodes/backend.yml' },
];

describe('YamlEditorToolbar', () => {
  it('renders one button per file', () => {
    renderWithWorkspace(
      <YamlEditorToolbar
        files={FILES}
        activeFilePath="/architecture/workspace.yml"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'workspace.yml' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'backend.yml' })).toBeInTheDocument();
  });

  it('reports the selected file', () => {
    const onSelect = vi.fn();
    renderWithWorkspace(
      <YamlEditorToolbar
        files={FILES}
        activeFilePath="/architecture/workspace.yml"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'backend.yml' }));

    expect(onSelect).toHaveBeenCalledWith(FILES[1]);
  });

  it('renders an empty toolbar without files', () => {
    renderWithWorkspace(
      <YamlEditorToolbar files={[]} activeFilePath="" onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('tablist')).toBeEmptyDOMElement();
  });
});
