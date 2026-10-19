import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import CompanyContactCell from '@src/components/organisms/ProjectComparisonTable/CompanyContactCell';

function renderCell(overrides: Partial<React.ComponentProps<typeof CompanyContactCell>> = {}) {
  return render(
    <MemoryRouter>
      <CompanyContactCell
        personId={1}
        companyId={1}
        companyName="Example GmbH"
        fallbackName="Fallback GmbH"
        onRefetch={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('CompanyContactCell', () => {
  it('links the linked company and shows its name', () => {
    renderCell();

    expect(screen.getByRole('link', { name: 'Example GmbH' })).toHaveAttribute(
      'href',
      '/admin/crm/companies/1',
    );
  });

  it('shows the fallback name without a CRM company', () => {
    renderCell({ companyId: null, companyName: null });

    expect(screen.getByText('Fallback GmbH')).toBeVisible();
  });

  it('stays read-only without a linked person', () => {
    renderCell({ personId: null });

    expect(screen.queryByLabelText('Firma ändern')).not.toBeInTheDocument();
  });

  it('re-points the person address to the selected company', async () => {
    const onRefetch = vi.fn();
    renderCell({ onRefetch });

    await userEvent.fill(screen.getByLabelText('Firma ändern'), 'Example');
    await userEvent.click(await screen.findByRole('option', { name: /Example GmbH/ }));

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
  });

  it('shows an empty hint when no company matches the query', async () => {
    renderCell();

    await userEvent.fill(screen.getByLabelText('Firma ändern'), 'Nichts');

    expect(await screen.findByText('Keine Firmen gefunden')).toBeVisible();
  });
});
