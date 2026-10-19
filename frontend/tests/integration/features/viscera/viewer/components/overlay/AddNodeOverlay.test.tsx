import { fireEvent, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import AddNodeOverlay from '@src/features/viscera/viewer/components/overlay/AddNodeOverlay';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  renderWithWorkspace,
} from '../../../visceraTestUtils';

const DIAGRAM = makeDiagram({
  key: 'backend-context',
  type: 'container',
  parent: 'shop',
  nodes: { backend: { x: 0, y: 0 } },
});

const WORKSPACE = makeWorkspace({
  objects: [
    makeObject({ id: 'shop', name: 'Shop', type: 'system' }),
    makeObject({ id: 'backend', name: 'Backend', type: 'container', parent: 'shop' }),
    makeObject({ id: 'core', name: 'Core', type: 'container', parent: 'shop' }),
  ],
});

function renderOverlay(overrides: Partial<Parameters<typeof AddNodeOverlay>[0]> = {}) {
  const props = {
    onConfirmPlaceholder: vi.fn().mockResolvedValue({}),
    onCancelPlaceholder: vi.fn(),
    ...overrides,
  };
  renderWithWorkspace(
    <ReactFlowProvider>
      <AddNodeOverlay {...props} />
    </ReactFlowProvider>,
    { workspace: WORKSPACE },
  );
  return props;
}

describe('AddNodeOverlay', () => {
  it('opens the creation menu with all node types', () => {
    renderOverlay();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button', { name: 'Add System' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Container' })).toBeInTheDocument();
  });

  it('does not persist a node before the name is confirmed', () => {
    const view = renderOverlay();

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Add System' }));

    expect(view.onConfirmPlaceholder).not.toHaveBeenCalled();
    expect(view.onCancelPlaceholder).not.toHaveBeenCalled();
  });

  it('offers the existing-node section and assigns a candidate', () => {
    const onAssignExistingNode = vi.fn();
    renderOverlay({ diagram: DIAGRAM, onAssignExistingNode });

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Vorhandener Node' }));

    expect(screen.getByRole('button', { name: /Core/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Backend/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Core/ }));

    expect(onAssignExistingNode).toHaveBeenCalledWith(['core']);
  });

  it('hides the existing-node section without an assignment handler', () => {
    renderOverlay({ diagram: DIAGRAM });

    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByRole('button', { name: 'Vorhandener Node' })).toBeNull();
  });
});
