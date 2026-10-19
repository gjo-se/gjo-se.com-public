import { DndContext } from '@dnd-kit/core';
import { fireEvent, screen } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import GroupNode from '@src/features/viscera/viewer/components/nodes/GroupNode';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Node, NodeTypes } from '@xyflow/react';

const NODE_TYPES = { group: GroupNode } as unknown as NodeTypes;

function renderGroup(overrides: Record<string, unknown> = {}) {
  const data = {
    name: 'Backend',
    width: 320,
    height: 200,
    onRenameGroup: vi.fn(),
    onDeleteGroup: vi.fn(),
    onSelectGroup: vi.fn(),
    ...overrides,
  };
  const nodes: Node[] = [
    {
      id: 'group-1',
      type: 'group',
      position: { x: 0, y: 0 },
      width: 320,
      height: 200,
      data,
    },
  ];
  const view = renderWithWorkspace(
    <div style={{ width: 800, height: 600 }}>
      <DndContext>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={NODE_TYPES} fitView={false} />
      </DndContext>
    </div>,
  );
  return { ...view, data };
}

describe('GroupNode', () => {
  it('renders the group label and boundary', async () => {
    const { container } = renderGroup();

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    expect(container.querySelector('.react-flow__node')).not.toBeNull();
  });

  it('opens the group details on double click', async () => {
    const { data, container } = renderGroup();

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    const boundary = container.querySelector('.react-flow__node svg') as SVGElement;
    fireEvent.doubleClick(boundary);

    expect(data.onSelectGroup).toHaveBeenCalledWith('group-1');
  });

  it('renames the group through the context menu', async () => {
    const { data, container } = renderGroup();

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    fireEvent.contextMenu(container.querySelector('.react-flow__node > div') as Element);
    fireEvent.click(screen.getByRole('button', { name: '✏️ Umbenennen' }));

    const input = screen.getByLabelText('Group umbenennen');
    fireEvent.change(input, { target: { value: 'Backend Team' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(data.onRenameGroup).toHaveBeenCalledWith('group-1', 'Backend Team');
  });

  it('deletes the group after confirmation', async () => {
    const { data, container } = renderGroup();

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    fireEvent.contextMenu(container.querySelector('.react-flow__node > div') as Element);
    fireEvent.click(screen.getByRole('button', { name: '🗑 Löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }));

    expect(data.onDeleteGroup).toHaveBeenCalledWith('group-1');
  });
});
