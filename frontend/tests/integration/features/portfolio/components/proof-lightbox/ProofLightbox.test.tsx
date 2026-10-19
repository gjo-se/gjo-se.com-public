import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProofLightbox from '@src/features/portfolio/components/proof-lightbox/ProofLightbox';

import { renderWithProviders } from '../../../integrationTestUtils';

import type { Proof } from '@src/features/portfolio/core/types';

const PROOFS: Proof[] = [
  {
    id: 1,
    image_src: null,
    priority: 'medium',
    question: 'Erste Frage',
    statement: 'Erstes Statement.',
  },
  {
    id: 2,
    image_src: null,
    priority: 'medium',
    question: 'Zweite Frage',
    statement: 'Zweites Statement.',
  },
];

describe('ProofLightbox', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <ProofLightbox
        proofs={PROOFS}
        openIndex={null}
        onClose={vi.fn()}
        streamUrl={() => '/stream'}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the active proof and its position in the collection', () => {
    renderWithProviders(
      <ProofLightbox
        proofs={PROOFS}
        openIndex={1}
        onClose={vi.fn()}
        streamUrl={() => '/stream'}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Beweis-Galerie' });
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Zweite Frage')).toBeInTheDocument();
    expect(within(dialog).getByText('Zweites Statement.')).toBeInTheDocument();
  });

  it('navigates with wrap-around between the proofs', async () => {
    renderWithProviders(
      <ProofLightbox
        proofs={PROOFS}
        openIndex={1}
        onClose={vi.fn()}
        streamUrl={() => '/stream'}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Nächster Beweis' }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Vorheriger Beweis' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('closes via the close button and via Escape', async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ProofLightbox
        proofs={PROOFS}
        openIndex={0}
        onClose={onClose}
        streamUrl={() => '/stream'}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('disables navigation for a single proof', () => {
    renderWithProviders(
      <ProofLightbox
        proofs={[PROOFS[0]]}
        openIndex={0}
        onClose={vi.fn()}
        streamUrl={() => '/stream'}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nächster Beweis' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vorheriger Beweis' })).toBeDisabled();
  });
});
