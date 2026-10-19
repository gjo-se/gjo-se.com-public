import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowPlayerSection from '@src/features/viscera/flows/components/player/FlowPlayerSection';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';
import type { UseFlowResult } from '@src/features/viscera/hooks/useFlow';

const FLOW: Flow = {
  id: 'login',
  title: 'Login',
  steps: [{ id: 's1', type: 'message', label: 'Anmelden' }],
  flowParentIds: [],
};

const CONTROLS: UseFlowResult = {
  activeStepIndex: 0,
  activeStep: FLOW.steps[0] ?? null,
  stepCount: 1,
  isPlaying: false,
  play: vi.fn(),
  pause: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  goToStep: vi.fn(),
  parentFlowIds: [],
};

describe('FlowPlayerSection', () => {
  it('renders the flow player with the selected flow', () => {
    renderWithWorkspace(
      <FlowPlayerSection
        flows={[FLOW]}
        activeFlow={FLOW}
        onSelectFlow={vi.fn()}
        flowControls={CONTROLS}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Step 1/1')).toBeInTheDocument();
    expect(screen.getByText('Anmelden')).toBeInTheDocument();
  });
});
