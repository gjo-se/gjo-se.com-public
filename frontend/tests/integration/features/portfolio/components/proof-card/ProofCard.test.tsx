import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProofCard from '@src/features/portfolio/components/proof-card/ProofCard';

import type { Proof } from '@src/features/portfolio/core/types';

const PROOF: Proof = {
  id: 1,
  image_src: 'portfolio/proof.webp',
  priority: 'medium',
  question: 'Warum?',
  statement: 'Weil es funktioniert.',
};

describe('ProofCard', () => {
  it('renders the question as eyebrow and the statement as caption', () => {
    render(<ProofCard proof={PROOF} streamUrl={() => '/stream/proof.webp'} />);

    expect(screen.getByText('Warum?')).toBeInTheDocument();
    expect(screen.getByText('Weil es funktioniert.')).toBeInTheDocument();
  });

  it('opens the lightbox when the card is clicked', async () => {
    const onClick = vi.fn();
    render(
      <ProofCard
        proof={PROOF}
        streamUrl={() => '/stream/proof.webp'}
        onClick={onClick}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Weil es funktioniert.' }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('opens the lightbox via the keyboard', async () => {
    const onClick = vi.fn();
    render(
      <ProofCard
        proof={PROOF}
        streamUrl={() => '/stream/proof.webp'}
        onClick={onClick}
      />,
    );

    const card = screen.getByRole('button', { name: 'Weil es funktioniert.' });
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders no interactive role without a click handler', () => {
    render(<ProofCard proof={PROOF} streamUrl={() => '/stream/proof.webp'} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
