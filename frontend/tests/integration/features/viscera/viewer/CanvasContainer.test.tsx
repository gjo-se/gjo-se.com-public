import { fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import CanvasContainer from '@src/features/viscera/viewer/CanvasContainer';

import { renderWithWorkspace } from '../visceraTestUtils';

import type { CanvasContainerProps } from '@src/features/viscera/viewer/CanvasContainer';
import type { Edge, Node } from '@xyflow/react';

const NODES: Node[] = [
  { id: 'node-1', position: { x: 20, y: 20 }, data: { label: 'Backend' } },
];

function canvasProps(overrides: Partial<CanvasContainerProps> = {}): CanvasContainerProps {
  return {
    nodes: NODES,
    edges: [] as Edge[],
    nodeTypes: {},
    edgeTypes: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    onViewportChange: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeDoubleClick: vi.fn(),
    onNodeMouseEnter: vi.fn(),
    onNodeMouseLeave: vi.fn(),
    onNodesChange: vi.fn(),
    diagramKey: 'SystemContext',
    ...overrides,
  };
}

function renderCanvas(props: CanvasContainerProps) {
  return renderWithWorkspace(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlowProvider>
        <CanvasContainer {...props} />
      </ReactFlowProvider>
    </div>,
  );
}

describe('CanvasContainer', () => {
  it('renders the react flow canvas', () => {
    const { container } = renderCanvas(canvasProps());

    expect(container.querySelector('.react-flow')).not.toBeNull();
    expect(container.querySelector('.react-flow__node')).not.toBeNull();
  });

  it('forwards node clicks to the provided handler', () => {
    const props = canvasProps();
    const { container } = renderCanvas(props);

    const node = container.querySelector('.react-flow__node');
    expect(node).not.toBeNull();
    if (node) {
      fireEvent.click(node);
    }

    expect(props.onNodeClick).toHaveBeenCalled();
  });

  it('applies the fullscreen container while active', () => {
    const { container } = renderCanvas(canvasProps({ isFullscreen: true }));

    expect(container.querySelector('.react-flow')).not.toBeNull();
    expect(container.querySelector('.fixed.inset-0')).not.toBeNull();
  });
});
