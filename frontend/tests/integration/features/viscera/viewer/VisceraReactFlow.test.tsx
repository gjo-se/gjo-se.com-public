import { screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import VisceraReactFlow from '@src/features/viscera/viewer/VisceraReactFlow';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  renderWithWorkspace,
} from '../visceraTestUtils';

import type { VisceraReactFlowProps } from '@src/features/viscera/viewer/VisceraReactFlow';

const WORKSPACE = makeWorkspace({
  objects: [
    makeObject({ id: 'shop', name: 'Shop', type: 'system' }),
    makeObject({ id: 'backend', name: 'Backend', type: 'container', parent: 'shop' }),
  ],
  diagrams: [
    makeDiagram({
      key: 'SystemContext',
      name: 'System Context',
      type: 'systemContext',
      nodes: { shop: { x: 0, y: 0 } },
    }),
  ],
});

function renderCanvas(overrides: Partial<VisceraReactFlowProps> = {}) {
  const props: VisceraReactFlowProps = {
    currentViewKey: 'SystemContext',
    onViewKeyChange: vi.fn(),
    onObjectClick: vi.fn(),
    ...overrides,
  };
  return renderWithWorkspace(
    <div style={{ width: 900, height: 600 }}>
      <ReactFlowProvider>
        <VisceraReactFlow {...props} />
      </ReactFlowProvider>
    </div>,
    { workspace: WORKSPACE },
  );
}

describe('VisceraReactFlow', () => {
  it('renders the canvas for the active workspace', async () => {
    const { container } = renderCanvas();

    await waitFor(() => expect(container.querySelector('.react-flow')).not.toBeNull());
  });

  it('renders the system node of the active diagram', async () => {
    renderCanvas();

    expect(await screen.findByText('Shop')).toBeInTheDocument();
  });

  it('renders nothing without workspace data', () => {
    const { container } = renderWithWorkspace(
      <div style={{ width: 900, height: 600 }}>
        <ReactFlowProvider>
          <VisceraReactFlow currentViewKey="SystemContext" onViewKeyChange={vi.fn()} />
        </ReactFlowProvider>
      </div>,
      { workspace: null },
    );

    expect(container.querySelector('.react-flow')).toBeNull();
    expect(screen.queryByText('Shop')).toBeNull();
  });
});
