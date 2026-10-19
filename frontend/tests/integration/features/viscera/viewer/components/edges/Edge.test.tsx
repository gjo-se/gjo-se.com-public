import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Position, ReactFlow } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import Edge from '@src/features/viscera/viewer/components/edges/Edge';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { EdgeData } from '@src/features/viscera/viewer/components/edges/Edge';
import type { Edge as FlowEdge, EdgeTypes, Node } from '@xyflow/react';

const EDGE_TYPES = { viscera: Edge } as unknown as EdgeTypes;

const NODES: Node[] = [
  {
    id: 'source-node',
    position: { x: 0, y: 0 },
    width: 120,
    height: 60,
    data: { label: 'Quelle' },
    sourcePosition: Position.Right,
  },
  {
    id: 'target-node',
    position: { x: 300, y: 120 },
    width: 120,
    height: 60,
    data: { label: 'Ziel' },
    targetPosition: Position.Left,
  },
];

function renderEdge(data: EdgeData = {}) {
  const edges: FlowEdge[] = [
    {
      id: 'edge-1',
      source: 'source-node',
      target: 'target-node',
      type: 'viscera',
      data,
    },
  ];
  const view = renderWithWorkspace(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlow nodes={NODES} edges={edges} edgeTypes={EDGE_TYPES} fitView={false} />
    </div>,
  );
  return view;
}

describe('Edge', () => {
  it('renders the edge path with an arrow marker', async () => {
    const { container } = renderEdge();

    await waitFor(() => expect(container.querySelector('path#edge-1')).not.toBeNull());
    expect(container.querySelector('marker#arrow-edge-1')).not.toBeNull();
  });

  it('shows the label when the edge is previewed', async () => {
    renderEdge({ label: 'ruft auf', previewed: true });

    expect(await screen.findByText('ruft auf')).toBeInTheDocument();
  });

  it('shows the description and technology tooltip on hover', async () => {
    const { container } = renderEdge({
      description: 'liest Daten',
      technology: 'SQL',
      previewed: true,
    });

    await waitFor(() =>
      expect(container.querySelector('path[stroke="transparent"]')).not.toBeNull(),
    );
    fireEvent.mouseEnter(container.querySelector('path[stroke="transparent"]') as Element);

    expect(await screen.findByText('liest Daten · SQL')).toBeInTheDocument();
  });

  it('opens the inline label editor on double click and cancels with Escape', async () => {
    renderEdge({ label: 'ruft auf', previewed: true });

    fireEvent.doubleClick(await screen.findByText('ruft auf'));

    const input = await screen.findByPlaceholderText('Label');
    fireEvent.change(input, { target: { value: 'neues Label' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('ruft auf')).toBeInTheDocument();
  });

  it('opens the delete confirmation from the context menu', async () => {
    const { container } = renderEdge({ label: 'ruft auf', previewed: true });

    await waitFor(() =>
      expect(container.querySelector('path[stroke="transparent"]')).not.toBeNull(),
    );
    fireEvent.contextMenu(container.querySelector('path[stroke="transparent"]') as Element);

    expect(await screen.findByRole('button', { name: '🗑 Edge löschen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🗑 Edge löschen' }));

    expect(screen.getByText('Edge wirklich löschen?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.getByRole('button', { name: '🗑 Edge löschen' })).toBeInTheDocument();
  });

  it('renders crow-foot markers for foreign-key edges', async () => {
    const { container } = renderEdge({ crowFoot: true });

    await waitFor(() =>
      expect(container.querySelector('marker#crow-many-edge-1')).not.toBeNull(),
    );
    expect(container.querySelector('marker#crow-one-edge-1')).not.toBeNull();
  });
});
