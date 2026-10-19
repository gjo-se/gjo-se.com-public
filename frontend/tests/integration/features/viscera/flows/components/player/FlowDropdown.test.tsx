import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowDropdown from '@src/features/viscera/flows/components/player/FlowDropdown';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';

const FLOWS: Flow[] = [
  {
    id: 'checkout',
    title: 'Checkout',
    steps: [{ id: 's1', type: 'message', label: 'Start' }],
    flowParentIds: [],
  },
  { id: 'login', title: 'Login', steps: [], flowParentIds: [] },
];

describe('FlowDropdown', () => {
  it('shows the placeholder without an active flow', () => {
    renderWithWorkspace(
      <FlowDropdown
        flows={FLOWS}
        activeFlow={null}
        onSelectFlow={vi.fn()}
        goToStep={vi.fn()}
        activeStepIndex={0}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    expect(screen.getByRole('button', { name: 'Flow auswählen…' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('lists all flows and reports the selected flow', () => {
    const onSelectFlow = vi.fn();
    renderWithWorkspace(
      <FlowDropdown
        flows={FLOWS}
        activeFlow={null}
        onSelectFlow={onSelectFlow}
        goToStep={vi.fn()}
        activeStepIndex={0}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Flow auswählen…' }));
    fireEvent.click(screen.getByRole('option', { name: 'Login' }));

    expect(onSelectFlow).toHaveBeenCalledWith('login');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the steps of the active flow and jumps on selection', () => {
    const goToStep = vi.fn();
    renderWithWorkspace(
      <FlowDropdown
        flows={FLOWS}
        activeFlow={FLOWS[0]}
        onSelectFlow={vi.fn()}
        goToStep={goToStep}
        activeStepIndex={0}
        getParentFlows={() => []}
        getSubFlows={() => []}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    fireEvent.click(screen.getByRole('listitem'));

    expect(goToStep).toHaveBeenCalledWith(0);
  });

  it('shows parent flow shortcuts when available', () => {
    const onSelectFlow = vi.fn();
    renderWithWorkspace(
      <FlowDropdown
        flows={FLOWS}
        activeFlow={FLOWS[0]}
        onSelectFlow={onSelectFlow}
        goToStep={vi.fn()}
        activeStepIndex={0}
        getParentFlows={() => [FLOWS[1]]}
        getSubFlows={() => []}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    fireEvent.click(screen.getByRole('button', { name: '↑ Parent: Login' }));

    expect(onSelectFlow).toHaveBeenCalledWith('login');
  });
});
