import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import GeneralCvDialog from '@src/features/application/components/general-cv-dialog/GeneralCvDialog';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

describe('GeneralCvDialog', () => {
  it('loads the CV preview when opened', async () => {
    renderWithProviders(<GeneralCvDialog open onOpenChange={() => undefined} />);

    expect(await screen.findByTitle('Lebenslauf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Herunterladen' })).toBeEnabled();
  });

  it('shows the API error when the CV cannot be loaded', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/cv`, () =>
        HttpResponse.json({ detail: 'CV fehlt' }, { status: 500 }),
      ),
    );

    renderWithProviders(<GeneralCvDialog open onOpenChange={() => undefined} />);

    expect(await screen.findByText(/CV fehlt/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Herunterladen' })).toBeDisabled();
  });

  it('renders nothing while closed', () => {
    renderWithProviders(
      <GeneralCvDialog open={false} onOpenChange={() => undefined} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
