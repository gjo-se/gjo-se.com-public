import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowStepList from '@src/features/viscera/flows/components/player/FlowStepList';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { FlowStep } from '@src/features/viscera/core/workspaceSchema';

const STEPS: FlowStep[] = [
  { id: 'step-1', type: 'message', from: 'client', to: 'api', label: 'Anfrage senden' },
  { id: 'step-2', type: 'process', from: 'api', to: 'db', label: 'Daten laden' },
];

describe('FlowStepList', () => {
  it('shows an empty hint when no steps exist', () => {
    renderWithWorkspace(<FlowStepList steps={[]} activeStepIndex={0} />);

    expect(screen.getByText('Keine Steps definiert')).toBeInTheDocument();
  });

  it('renders each step with its from/to edge', () => {
    renderWithWorkspace(<FlowStepList steps={STEPS} activeStepIndex={0} />);

    expect(screen.getByText('Anfrage senden')).toBeInTheDocument();
    expect(screen.getByText('Daten laden')).toBeInTheDocument();
    expect(screen.getByText('client → api')).toBeInTheDocument();
    expect(screen.getByText('api → db')).toBeInTheDocument();
  });

  it('marks the active step and reports clicks', () => {
    const onSelectStep = vi.fn();
    renderWithWorkspace(
      <FlowStepList steps={STEPS} activeStepIndex={1} onSelectStep={onSelectStep} />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');

    fireEvent.click(items[0]);
    expect(onSelectStep).toHaveBeenCalledWith(0);
  });
});
