import { describe, expect, it } from 'vitest';

import FlowHighlighter from '@src/features/viscera/flows/components/player/FlowHighlighter';

import { makeDiagram, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

const WORKSPACE = makeWorkspace({
  diagrams: [makeDiagram({ key: 'SystemContext', name: 'System Context' })],
  objects: [
    { id: 'backend', name: 'Backend', description: '', type: 'system', external: false },
  ],
});

describe('FlowHighlighter', () => {
  it('renders the diagram canvas for the workspace', () => {
    const { container } = renderWithWorkspace(<FlowHighlighter />, { workspace: WORKSPACE });

    expect(container.querySelector('.react-flow')).not.toBeNull();
  });

  it('renders the active flow step without breaking the canvas', () => {
    const { container } = renderWithWorkspace(
      <FlowHighlighter activeFlowStep={{ id: 's1', type: 'message', from: 'backend', to: 'frontend' }} />,
      { workspace: WORKSPACE },
    );

    expect(container.querySelector('.react-flow')).not.toBeNull();
  });

  it('renders nothing while the workspace is missing', () => {
    const { container } = renderWithWorkspace(<FlowHighlighter />, { workspace: null });

    expect(container.querySelector('.react-flow')).toBeNull();
  });
});
