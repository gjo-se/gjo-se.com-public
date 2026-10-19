import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import ExperienceDialog from '@src/features/application-profile/components/experience-dialog/ExperienceDialog';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

import type { ExperienceOut } from '@src/lib/api/applicationProfile';

const EXPERIENCE: ExperienceOut = {
  id: 1,
  applicationProfileId: 1,
  position: 'Senior Developer',
  company: 'Example GmbH',
  projectUrl: null,
  startDate: '2024-03-01',
  endDate: null,
  sort: 0,
  status: null,
  status_color_token: null,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  translations: { de: { context: 'Kontext DE' } },
  decisions: [],
  proofs: [],
};

describe('ExperienceDialog', () => {
  it('opens in create mode with empty fields', () => {
    renderWithProviders(
      <ExperienceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.getByText('Neues Projekt')).toBeInTheDocument();
    expect(screen.getByLabelText('Rolle')).toHaveValue('');
  });

  it('prefills the form in edit mode', () => {
    renderWithProviders(
      <ExperienceDialog
        open
        onOpenChange={vi.fn()}
        experience={EXPERIENCE}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('Projekt bearbeiten')).toBeInTheDocument();
    expect(screen.getByLabelText('Rolle')).toHaveValue('Senior Developer');
    expect(screen.getByLabelText('Kontext')).toHaveValue('Kontext DE');
  });

  it('switches the text-block language', () => {
    renderWithProviders(
      <ExperienceDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Deutsch' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByRole('heading', { name: 'English' })).toBeInTheDocument();
  });

  it('creates a project with the typed scalar fields', async () => {
    let body: Record<string, unknown> | null = null;
    worker.use(
      http.post(`${base}/admin/application-profile/experience`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(EXPERIENCE);
      }),
    );
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExperienceDialog open onOpenChange={onOpenChange} onSaved={onSaved} />,
    );

    fireEvent.change(screen.getByLabelText('Rolle'), {
      target: { value: 'Lead Developer' },
    });
    fireEvent.change(screen.getByLabelText('Startdatum'), {
      target: { value: '2025-02-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      position: 'Lead Developer',
      start_date: '2025-02-01',
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
