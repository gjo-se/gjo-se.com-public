import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import EndCustomerResearchSection from '@src/features/aiscope/components/endcustomer-research/EndCustomerResearchSection';
import { worker } from '@src/mocks/browser';

const candidate = {
  id: 11,
  project_id: 1,
  company_name: 'Beispiel AG',
  website: 'https://beispiel.example',
  career_page_url: 'https://beispiel.example/jobs',
  confidence: 0.8,
  source: 'web',
  career_page_description: null,
  similarity_to_project: 0.6,
  reasoning: 'Passt zur Beschreibung.',
  status: 'pending',
  status_color_token: 'amber',
  created_at: '2026-01-01T00:00:00Z',
};

function renderSection(researchedAt: string | null = null) {
  return render(
    <MantineProvider>
      <EndCustomerResearchSection
        projectId={1}
        endcustomerIsSet={false}
        endcustomerResearchedAt={researchedAt}
      />
    </MantineProvider>,
  );
}

describe('EndCustomerResearchSection', () => {
  it('renders the research header and trigger', () => {
    renderSection();

    expect(screen.getByText('Endkunden-Recherche')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recherche starten' })).toBeInTheDocument();
  });

  it('lists the researched candidates with a combined score', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/:id/endcustomer-candidates', () =>
        HttpResponse.json([candidate]),
      ),
    );
    renderSection('2026-01-01T00:00:00Z');

    expect(await screen.findByText('Beispiel AG')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('beispiel.example/jobs')).toBeInTheDocument();
  });

  it('offers confirm and reject actions per candidate', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/:id/endcustomer-candidates', () =>
        HttpResponse.json([candidate]),
      ),
    );
    renderSection('2026-01-01T00:00:00Z');

    expect(await screen.findByRole('button', { name: 'Bestätigen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument();
  });

  it('opens the confirm dialog before turning a candidate into an endcustomer', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/:id/endcustomer-candidates', () =>
        HttpResponse.json([candidate]),
      ),
    );
    renderSection('2026-01-01T00:00:00Z');

    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigen' }));

    expect(screen.getByText('Endkunde bestätigen')).toBeInTheDocument();
    expect(screen.getByText(/Bist du sicher/)).toBeInTheDocument();
  });

  it('removes a rejected candidate from the table', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/:id/endcustomer-candidates', () =>
        HttpResponse.json([candidate]),
      ),
    );
    renderSection('2026-01-01T00:00:00Z');

    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen' }));

    await waitFor(() => expect(screen.queryByText('Beispiel AG')).not.toBeInTheDocument());
  });
});
