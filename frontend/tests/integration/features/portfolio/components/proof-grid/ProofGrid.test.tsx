import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProofGrid from '@src/features/portfolio/components/proof-grid/ProofGrid';

import { renderWithProviders } from '../../../integrationTestUtils';

import type { Proof } from '@src/features/portfolio/core/types';

const PROOFS: Proof[] = [
  {
    id: 1,
    image_src: 'portfolio/one.webp',
    priority: 'high',
    question: 'Erste Frage',
    statement: 'Erstes Statement.',
  },
  {
    id: 2,
    image_src: 'portfolio/two.webp',
    priority: 'medium',
    question: 'Zweite Frage',
    statement: 'Zweites Statement.',
  },
];

describe('ProofGrid', () => {
  it('renders eyebrow, title and all proof cards', () => {
    renderWithProviders(
      <ProofGrid
        proofs={PROOFS}
        streamUrl={(key) => `/stream/${key}`}
        eyebrow="// Beweise"
        title="Belege"
      />,
    );

    expect(screen.getByText('// Beweise')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Belege' })).toBeInTheDocument();
    expect(screen.getByText('Erstes Statement.')).toBeInTheDocument();
    expect(screen.getByText('Zweites Statement.')).toBeInTheDocument();
  });

  it('opens the lightbox at the clicked proof', async () => {
    renderWithProviders(
      <ProofGrid proofs={PROOFS} streamUrl={(key) => `/stream/${key}`} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Zweites Statement.' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Beweis-Galerie' });
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Zweite Frage')).toBeInTheDocument();
  });

  it('renders nothing without proofs', () => {
    renderWithProviders(<ProofGrid proofs={[]} streamUrl={(key) => `/stream/${key}`} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
