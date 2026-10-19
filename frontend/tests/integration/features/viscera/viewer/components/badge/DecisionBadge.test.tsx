import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DecisionBadge from '@src/features/viscera/viewer/components/badge/DecisionBadge';

import type { Adr } from '@src/features/viscera/adrs/hooks/useAdrs';

function decision(index: number): Adr {
  return {
    id: index,
    idString: String(index).padStart(4, '0'),
    title: `Entscheidung ${index}`,
    status: 'accepted',
    date: '2026-01-01',
    systems: ['backend'],
    diagrams: [],
    tags: [],
    content: '',
    filePath: `/architecture/adr/00${index}-test.md`,
  };
}

function renderBadge(decisions: Adr[]) {
  return render(
    <svg>
      <DecisionBadge decisions={decisions} systemId="backend" cardWidth={280} />
    </svg>,
  );
}

describe('DecisionBadge', () => {
  it('is hidden without decisions', () => {
    const { container } = renderBadge([]);

    expect(container.querySelector('g')).toBeNull();
  });

  it('summarises a single decision in the tooltip', () => {
    const { container } = renderBadge([decision(1)]);

    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(container.querySelector('title')).toHaveTextContent(
      'Architecture Decision',
    );
    expect(container.querySelector('title')).toHaveTextContent('0001 – Entscheidung 1');
  });

  it('caps the tooltip and reports the remaining count', () => {
    const decisions = [1, 2, 3, 4, 5, 6, 7].map(decision);
    const { container } = renderBadge(decisions);

    const tooltip = container.querySelector('title')?.textContent ?? '';
    expect(tooltip).toContain('7 Architecture Decisions');
    expect(tooltip).toContain('… und 2 weitere');
    expect(tooltip).not.toContain('0006 – Entscheidung 6');
  });
});
