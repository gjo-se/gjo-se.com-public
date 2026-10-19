import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import CompanySheet from '@src/features/crm/components/sheet/CompanySheet';
import { worker } from '@src/mocks/browser';

describe('CompanySheet', () => {
  it('shows the loading hint first, then the loaded addresses', async () => {
    render(<CompanySheet companyId={1} companyName="Example GmbH" />);

    expect(screen.getByText('Lade Adressen…')).toBeInTheDocument();
    expect(await screen.findByText('Adressen')).toBeInTheDocument();
  });

  it('renders the address label and formatted address', async () => {
    render(<CompanySheet companyId={1} companyName="Example GmbH" />);

    expect(await screen.findByText(/HQ|Hauptsitz|Fixture/)).toBeInTheDocument();
  });

  it('shows the empty hint when the company has no addresses', async () => {
    worker.use(
      http.get('/api/v1/admin/crm/companies/:id/addresses', () => HttpResponse.json([])),
    );
    render(<CompanySheet companyId={1} companyName="Example GmbH" />);

    expect(await screen.findByText('Keine Adressen hinterlegt.')).toBeInTheDocument();
  });

  it('shows the API error message when loading fails', async () => {
    worker.use(
      http.get('/api/v1/admin/crm/companies/:id/addresses', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    render(<CompanySheet companyId={1} companyName="Example GmbH" />);

    expect(await screen.findByText('Fehler beim Laden der Adressen.')).toBeInTheDocument();
  });

  it('always renders the placeholder for associated persons', () => {
    render(<CompanySheet companyId={1} companyName="Example GmbH" />);

    expect(screen.getByText('Zugehörige Personen')).toBeInTheDocument();
    expect(
      screen.getByText('Personen-Verknüpfungen folgen in einem späteren Ticket.'),
    ).toBeInTheDocument();
  });
});
