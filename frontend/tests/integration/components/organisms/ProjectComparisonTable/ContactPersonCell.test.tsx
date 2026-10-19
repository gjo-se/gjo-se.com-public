import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ContactPersonCell from '@src/components/organisms/ProjectComparisonTable/ContactPersonCell';

function renderCell(overrides: Partial<React.ComponentProps<typeof ContactPersonCell>> = {}) {
  return render(
    <MemoryRouter>
      <ContactPersonCell
        projectId={1}
        linkId={null}
        personId={1}
        personName="Alex Beispiel"
        fallbackName="Fallback Kontakt"
        onRefetch={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('ContactPersonCell', () => {
  it('links the linked CRM person and shows the name', () => {
    renderCell();

    expect(screen.getByRole('link', { name: 'Alex Beispiel' })).toHaveAttribute(
      'href',
      '/admin/crm/persons/1',
    );
  });

  it('shows the fallback contact without a CRM person', () => {
    renderCell({ personId: null, personName: null });

    expect(screen.getByText('Fallback Kontakt')).toBeVisible();
  });

  it('links the selected person as the new primary contact', async () => {
    const onRefetch = vi.fn();
    renderCell({ onRefetch, personId: 2, personName: 'Andere Person' });

    await userEvent.fill(screen.getByLabelText('Kontakt ändern'), 'Alex');
    await userEvent.click(await screen.findByRole('option', { name: /Alex Beispiel/ }));

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
  });

  it('shows an empty hint when no person matches the query', async () => {
    renderCell();

    await userEvent.fill(screen.getByLabelText('Kontakt ändern'), 'Nichts');

    expect(await screen.findByText('Keine Personen gefunden')).toBeVisible();
  });
});
