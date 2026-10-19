import { fireEvent, screen } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import CardNodeToolbar from '@src/features/viscera/viewer/components/nodes/CardNodeToolbar';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { CardNodeToolbarProps } from '@src/features/viscera/viewer/components/nodes/CardNodeToolbar';
import type { Node, NodeProps, NodeTypes } from '@xyflow/react';

function ToolbarProbe({ data }: NodeProps) {
  return <CardNodeToolbar {...(data.toolbar as CardNodeToolbarProps)} />;
}

const NODE_TYPES = { toolbar: ToolbarProbe } as unknown as NodeTypes;

function renderToolbar(overrides: Partial<CardNodeToolbarProps> = {}) {
  const toolbar: CardNodeToolbarProps = {
    isEditing: false,
    nodeId: 'node-1',
    cardWidth: 200,
    cardHeight: 120,
    ...overrides,
  };
  const nodes: Node[] = [
    {
      id: 'node-1',
      type: 'toolbar',
      position: { x: 0, y: 0 },
      width: 200,
      height: 120,
      data: { toolbar },
    },
  ];
  renderWithWorkspace(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlow nodes={nodes} edges={[]} nodeTypes={NODE_TYPES} fitView={false} />
    </div>,
  );
  return toolbar;
}

describe('CardNodeToolbar', () => {
  it('shows the cancel button while editing', async () => {
    const view = renderToolbar({ isEditing: true, onCancelEdit: vi.fn() });

    fireEvent.click(await screen.findByTitle('Abbrechen'));

    expect(view.onCancelEdit).toHaveBeenCalledOnce();
  });

  it('shows the annotation badge when annotations exist', async () => {
    renderToolbar({
      annotations: [{ text: 'Notiz', author: 'Greg', date: '2026-01-01' }],
      onAddAnnotation: vi.fn(),
    });

    expect(await screen.findByText('💬 1')).toBeInTheDocument();
  });

  it('renders no badges without decisions or annotations', () => {
    renderToolbar();

    expect(screen.queryByRole('button', { name: 'Abbrechen' })).toBeNull();
    expect(screen.queryByText(/💬/)).toBeNull();
  });
});
