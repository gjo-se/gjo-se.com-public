import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProofSubTable from '@src/features/portfolio/components/proof-sub-table/ProofSubTable';
import { worker } from '@src/mocks/browser';
import { base, noContent } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

describe('ProofSubTable', () => {
  it('loads and renders the proofs of the project', async () => {
    renderWithProviders(<ProofSubTable slug="fixture-project" locale="de" />);

    expect(await screen.findByText('Beispiel-Statement.')).toBeInTheDocument();
    expect(screen.getByText('Proofs (1)')).toBeInTheDocument();
  });

  it('shows a load error instead of the table', async () => {
    worker.use(
      http.get(`${base}/admin/portfolio/:slug/proofs`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    renderWithProviders(<ProofSubTable slug="fixture-project" locale="de" />);

    expect(await screen.findByText('Fehler beim Laden der Proofs.')).toBeInTheDocument();
  });

  it('confirms the delete dialog before deleting the proof', async () => {
    let deleted = false;
    worker.use(
      http.delete(`${base}/admin/portfolio/:slug/proofs/:proofId`, () => {
        deleted = true;
        return noContent();
      }),
    );

    renderWithProviders(<ProofSubTable slug="fixture-project" locale="de" />);
    expect(await screen.findByText('Beispiel-Statement.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Proof löschen')).toBeInTheDocument();
    expect(deleted).toBe(false);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(deleted).toBe(true));
  });
});
