import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import ExportButton from '@src/features/viscera/shared/ExportButton';

import type { Node } from '@xyflow/react';

const NODES: Node[] = [
  { id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Backend' } },
  { id: 'node-2', position: { x: 240, y: 120 }, data: { label: 'Frontend' } },
];

const EDGES = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];

function renderWithFlow(nodes: Node[]) {
  return render(
    <div style={{ width: 600, height: 400 }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={nodes.length > 0 ? EDGES : []}
          fitView={false}
        >
          <ExportButton viewKey="System Landscape" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>,
  );
}

describe('ExportButton', () => {
  it('renders the export action', () => {
    renderWithFlow(NODES);

    expect(
      screen.getByRole('button', { name: 'Diagramm als SVG exportieren' }),
    ).toBeInTheDocument();
  });

  it('downloads an svg file named after the view key', async () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });

    const { container } = renderWithFlow(NODES);

    // The export reads the rendered edge SVG – wait until React Flow has measured
    // the nodes and mounted the edge layer.
    await waitFor(() =>
      expect(container.querySelector('.react-flow__edges > svg')).not.toBeNull(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Diagramm als SVG exportieren' }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^system-landscape-\d{4}-\d{2}-\d{2}T/);
  });

  it('does nothing when the diagram has no nodes', () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });

    renderWithFlow([]);
    fireEvent.click(screen.getByRole('button', { name: 'Diagramm als SVG exportieren' }));

    expect(downloads).toHaveLength(0);
  });
});
