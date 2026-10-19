import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AssignToDiagramDialog from '@src/features/viscera/viewer/components/dialog/AssignToDiagramDialog';

import { makeDiagram, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

const WORKSPACE = makeWorkspace({
  objects: [
    { id: 'backend', name: 'Backend', description: '', type: 'system', external: false },
    { id: 'frontend', name: 'Frontend', description: '', type: 'system', external: false },
  ],
});

describe('AssignToDiagramDialog', () => {
  it('lists the matching node candidates', () => {
    renderWithWorkspace(
      <AssignToDiagramDialog
        open
        onOpenChange={vi.fn()}
        diagram={makeDiagram()}
        onAssign={vi.fn()}
      />,
      { workspace: WORKSPACE },
    );

    expect(screen.getByText('Nodes zu System Context hinzufügen')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('cannot submit without a selection', () => {
    renderWithWorkspace(
      <AssignToDiagramDialog
        open
        onOpenChange={vi.fn()}
        diagram={makeDiagram()}
        onAssign={vi.fn()}
      />,
      { workspace: WORKSPACE },
    );

    expect(screen.getByRole('button', { name: '0 Nodes hinzufügen' })).toBeDisabled();
  });

  it('assigns the selected node ids', () => {
    const onAssign = vi.fn();
    renderWithWorkspace(
      <AssignToDiagramDialog
        open
        onOpenChange={vi.fn()}
        diagram={makeDiagram()}
        onAssign={onAssign}
      />,
      { workspace: WORKSPACE },
    );

    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: '1 Nodes hinzufügen' }));

    expect(onAssign).toHaveBeenCalledWith(['backend']);
  });

  it('shows the empty state without candidates', () => {
    renderWithWorkspace(
      <AssignToDiagramDialog
        open
        onOpenChange={vi.fn()}
        diagram={null}
        onAssign={vi.fn()}
      />,
      { workspace: WORKSPACE },
    );

    expect(screen.getByText('Keine passenden Nodes verfügbar')).toBeInTheDocument();
  });

  it('renders a passed server error', () => {
    renderWithWorkspace(
      <AssignToDiagramDialog
        open
        onOpenChange={vi.fn()}
        diagram={makeDiagram()}
        onAssign={vi.fn()}
        error="Zuweisung fehlgeschlagen"
      />,
      { workspace: WORKSPACE },
    );

    expect(screen.getByText('Zuweisung fehlgeschlagen')).toBeInTheDocument();
  });
});
