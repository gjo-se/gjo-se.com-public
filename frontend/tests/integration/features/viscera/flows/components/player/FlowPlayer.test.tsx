import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowPlayer from '@src/features/viscera/flows/components/player/FlowPlayer';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';
import type { UseFlowResult } from '@src/features/viscera/hooks/useFlow';

const FLOW: Flow = {
  id: 'checkout',
  title: 'Checkout',
  steps: [
    { id: 's1', type: 'message', label: 'Start' },
    { id: 's2', type: 'process', label: 'Ende' },
  ],
  flowParentIds: [],
};

function flowControls(overrides: Partial<UseFlowResult> = {}): UseFlowResult {
  return {
    activeStepIndex: 0,
    activeStep: FLOW.steps[0] ?? null,
    stepCount: FLOW.steps.length,
    isPlaying: false,
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    goToStep: vi.fn(),
    parentFlowIds: [],
    ...overrides,
  };
}

describe('FlowPlayer', () => {
  it('renders only the flow selector without an active flow', () => {
    renderWithWorkspace(
      <FlowPlayer
        flows={[FLOW]}
        activeFlow={null}
        onSelectFlow={vi.fn()}
        flowControls={flowControls({ activeStep: null, stepCount: 0 })}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    expect(screen.getByRole('button', { name: 'Flow auswählen…' })).toBeInTheDocument();
    expect(screen.queryByText(/Step \d\/\d/)).not.toBeInTheDocument();
  });

  it('renders playback controls and the active step label', () => {
    renderWithWorkspace(
      <FlowPlayer
        flows={[FLOW]}
        activeFlow={FLOW}
        onSelectFlow={vi.fn()}
        flowControls={flowControls()}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('forwards control clicks to the flow controls', () => {
    const controls = flowControls();
    renderWithWorkspace(
      <FlowPlayer
        flows={[FLOW]}
        activeFlow={FLOW}
        onSelectFlow={vi.fn()}
        flowControls={controls}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    fireEvent.click(screen.getByTitle('Nächster Step'));

    expect(controls.next).toHaveBeenCalledTimes(1);
  });
});
