import { DndContext, useDraggable } from '@dnd-kit/core';
import { screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import VisceraDndContext from '@src/features/viscera/viewer/components/dnd/VisceraDndContext';

import { makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

function DraggableProbe() {
  const { setNodeRef, attributes } = useDraggable({
    id: 'node-1',
    data: { dndType: 'card' },
  });
  return (
    <div ref={setNodeRef} {...attributes}>
      Draggable Probe
    </div>
  );
}

function renderDnd(children = <p>Canvas Inhalt</p>) {
  return renderWithWorkspace(
    <ReactFlowProvider>
      <DndContext>
        <VisceraDndContext diagramKey="SystemContext">{children}</VisceraDndContext>
      </DndContext>
    </ReactFlowProvider>,
    { workspace: makeWorkspace() },
  );
}

describe('VisceraDndContext', () => {
  it('renders its children unchanged', () => {
    renderDnd();

    expect(screen.getByText('Canvas Inhalt')).toBeInTheDocument();
  });

  it('provides the drag-and-drop context to descendants', () => {
    renderDnd(<DraggableProbe />);

    const probe = screen.getByText('Draggable Probe');
    expect(probe).toHaveAttribute('aria-roledescription', 'draggable');
    expect(probe).toHaveAttribute('tabindex', '0');
  });

  it('renders for a workspace without groups', () => {
    renderDnd(<p>Kein Drag-Ziel</p>);

    expect(screen.getByText('Kein Drag-Ziel')).toBeInTheDocument();
  });
});
