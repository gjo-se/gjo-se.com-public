import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  enrichProjectContacts,
  fetchCompanies,
  fetchPersons,
} from '@src/lib/api/crm';

import ProjectEnrichDialog from '@src/components/molecules/ProjectEnrichDialog/ProjectEnrichDialog';

import type { ProjectEnrichResponse } from '@src/lib/api/crm';

vi.mock('@src/lib/api/crm', () => ({
  enrichProjectContacts: vi.fn(),
  fetchCompanies: vi.fn(),
  fetchPersons: vi.fn(),
  createCompany: vi.fn(),
  createPerson: vi.fn(),
}));

/** Minimal enrichment response for the dialog assertions. */
function enrichResponse(
  details: ProjectEnrichResponse['enrichment_details'],
): ProjectEnrichResponse {
  return {
    company: { id: 92, name: 'SOFI AI GmbH' },
    person: { id: 106, first_name: 'Yannic', last_name: 'Röcken' },
    project_crm_person_link_id: 5,
    enrichment_details: details,
  } as unknown as ProjectEnrichResponse;
}

function renderDialog() {
  render(
    <MemoryRouter>
      <ProjectEnrichDialog
        open
        onOpenChange={vi.fn()}
        projectId={1}
        companyName="SOFI AI GmbH"
        contactName="Yannic Röcken"
      />
    </MemoryRouter>,
  );
}

describe('ProjectEnrichDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCompanies).mockResolvedValue([]);
    vi.mocked(fetchPersons).mockResolvedValue([]);
  });

  it('shows the credit warning when hunter reports insufficient credits', async () => {
    vi.mocked(enrichProjectContacts).mockResolvedValue(
      enrichResponse({
        company_enriched: false,
        person_enriched: false,
        hunter_error: 'insufficient_credits',
        hunter_error_message: 'You’ve reached the limit for the searches.',
      }),
    );
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Anreichern' }));

    expect(
      await screen.findByText(/Hunter.io-Kontingent ist aufgebraucht/),
    ).toBeInTheDocument();
  });

  it('does not show the credit warning when no hunter error is reported', async () => {
    vi.mocked(enrichProjectContacts).mockResolvedValue(
      enrichResponse({ company_enriched: true, person_enriched: true }),
    );
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Anreichern' }));

    expect(await screen.findByText('Ergebnis')).toBeInTheDocument();
    expect(
      screen.queryByText(/Hunter.io-Kontingent ist aufgebraucht/),
    ).not.toBeInTheDocument();
  });
});
