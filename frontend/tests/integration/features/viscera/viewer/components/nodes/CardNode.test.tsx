import { DndContext } from '@dnd-kit/core';
import { fireEvent, screen } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import CardNode from '@src/features/viscera/viewer/components/nodes/CardNode';

import { makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

import type { CardNodeData } from '@src/features/viscera/viewer/components/nodes/CardNode';
import type { Node, NodeTypes } from '@xyflow/react';

const NODE_TYPES = { card: CardNode } as unknown as NodeTypes;

function renderCard(overrides: Partial<CardNodeData> = {}) {
  const data: CardNodeData = {
    name: 'Backend',
    kind: 'container',
    cardWidth: 200,
    cardHeight: 120,
    ...overrides,
  };
  const nodes: Node[] = [
    {
      id: 'node-1',
      type: 'card',
      position: { x: 20, y: 20 },
      width: 200,
      height: 120,
      data,
    },
  ];
  const view = renderWithWorkspace(
    <div style={{ width: 800, height: 600 }}>
      <DndContext>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={NODE_TYPES} fitView={false} />
      </DndContext>
    </div>,
    { workspace: makeWorkspace() },
  );
  return { ...view, data };
}

describe('CardNode', () => {
  it('renders the name and description', async () => {
    renderCard({ description: 'Die API' });

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Die API')).toBeInTheDocument();
  });

  it('renders nothing when the node is hidden', () => {
    renderCard({ hidden: true });

    expect(screen.queryByText('Backend')).toBeNull();
  });

  it('shows the inline edit input and the editing error', async () => {
    renderCard({ isEditing: true, editingLabel: 'Neuer Name', editingError: 'Fehler beim Speichern' });

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Fehler beim Speichern')).toBeInTheDocument();
  });

  it('opens the context menu on right click', async () => {
    const { container } = renderCard({ onCreateComponent: vi.fn() });

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    const card = container.querySelector('div.nopan[role="button"]') as HTMLElement;
    fireEvent.contextMenu(card);

    expect(await screen.findByText('＋ Component')).toBeInTheDocument();
    expect(screen.getByText('📋 ID kopieren')).toBeInTheDocument();
  });

  it('cancels the edit mode through the toolbar button', async () => {
    const onCancelEdit = vi.fn();
    renderCard({ isEditing: true, onCancelEdit });

    fireEvent.click(await screen.findByTitle('Abbrechen'));

    expect(onCancelEdit).toHaveBeenCalledOnce();
  });
});
