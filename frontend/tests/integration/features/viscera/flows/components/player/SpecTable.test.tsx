import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SpecTable from '@src/features/viscera/flows/components/player/SpecTable';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';

const FLOW: Flow = {
  id: 'checkout',
  title: 'Checkout',
  steps: [
    {
      id: 'step-1',
      type: 'message',
      from: 'shop',
      to: 'payment',
      label: 'Zahlung starten',
      spec: { given: 'Warenkorb gefüllt', when: 'Checkout klickt', then: 'Zahlung offen' },
    },
    { id: 'step-2', type: 'decision', from: 'payment', to: 'order', label: 'Prüfen' },
  ],
  flowParentIds: [],
};

describe('SpecTable', () => {
  it('renders the Given/When/Then matrix for all steps', () => {
    renderWithWorkspace(<SpecTable flow={FLOW} activeStepIndex={0} />);

    expect(screen.getByText('Flow Spec – Given / When / Then')).toBeInTheDocument();
    expect(screen.getByText('Warenkorb gefüllt')).toBeInTheDocument();
    expect(screen.getByText('Checkout klickt')).toBeInTheDocument();
    expect(screen.getByText('Zahlung offen')).toBeInTheDocument();
  });

  it('renders dashes for steps without a spec', () => {
    renderWithWorkspace(<SpecTable flow={FLOW} activeStepIndex={0} />);

    expect(screen.getAllByText('–')).toHaveLength(3);
  });

  it('marks the active step row', () => {
    const { container } = renderWithWorkspace(<SpecTable flow={FLOW} activeStepIndex={1} />);

    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
    expect(screen.getByText('▶')).toBeInTheDocument();
  });
});
