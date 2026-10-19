import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ContactEntityPicker from '@src/components/molecules/ProjectEnrichDialog/ContactEntityPicker';

interface Company {
  id: number;
  name: string;
}

const companies: Company[] = [
  { id: 1, name: 'Example GmbH' },
  { id: 2, name: 'Beispiel AG' },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof ContactEntityPicker<Company>>> = {}) {
  return render(
    <ContactEntityPicker<Company>
      label="Firma"
      placeholder="Firma suchen…"
      emptyText="Keine Firmen gefunden"
      query=""
      onQueryChange={vi.fn()}
      items={companies}
      getKey={(company) => String(company.id)}
      renderItem={(company) => company.name}
      onSelect={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ContactEntityPicker', () => {
  it('renders the label and the selected entity', () => {
    renderPicker({ selectedLabel: 'Example GmbH' });

    expect(screen.getByText('Firma')).toBeVisible();
    expect(screen.getByText('Example GmbH')).toBeVisible();
  });

  it('reports the selected entity', async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    await userEvent.click(screen.getByPlaceholderText('Firma suchen…'));
    await userEvent.click(await screen.findByText('Beispiel AG'));

    expect(onSelect).toHaveBeenCalledWith(companies[1]);
  });

  it('reports query changes to the parent', async () => {
    const onQueryChange = vi.fn();
    renderPicker({ onQueryChange });

    await userEvent.fill(screen.getByPlaceholderText('Firma suchen…'), 'Exa');

    expect(onQueryChange).toHaveBeenCalledWith('Exa');
  });

  it('offers the create action when the search has no result', async () => {
    const onCreate = vi.fn();
    renderPicker({
      query: 'Neue Firma',
      items: [],
      createLabel: 'Firma anlegen',
      onCreate,
    });

    await userEvent.click(screen.getByPlaceholderText('Firma suchen…'));

    expect(await screen.findByText('Keine Firmen gefunden')).toBeVisible();
    await userEvent.click(screen.getByText(/Firma anlegen/));

    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('hides the create action without a handler', () => {
    renderPicker({ query: 'Neue Firma', items: [], createLabel: 'Firma anlegen' });

    expect(screen.queryByText(/Firma anlegen/)).not.toBeInTheDocument();
  });
});
