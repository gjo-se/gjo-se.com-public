import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import EntityLinkCombobox from '@src/components/molecules/EntityLinkCombobox/EntityLinkCombobox';

interface Company {
  id: number;
  name: string;
}

const companies: Company[] = [
  { id: 1, name: 'Example GmbH' },
  { id: 2, name: 'Beispiel AG' },
];

function renderCombobox(overrides: Partial<React.ComponentProps<typeof EntityLinkCombobox<Company>>> = {}) {
  return render(
    <EntityLinkCombobox<Company>
      placeholder="Firma suchen…"
      emptyText="Keine Firmen gefunden"
      onSearch={vi.fn().mockResolvedValue(companies)}
      onLink={vi.fn().mockResolvedValue(undefined)}
      renderItem={(company) => company.name}
      getItemValue={(company) => String(company.id)}
      {...overrides}
    />,
  );
}

describe('EntityLinkCombobox', () => {
  it('renders the search input with its placeholder', () => {
    renderCombobox();

    expect(screen.getByPlaceholderText('Firma suchen…')).toBeVisible();
  });

  it('shows the search results for the typed query', async () => {
    renderCombobox();

    await userEvent.fill(screen.getByPlaceholderText('Firma suchen…'), 'Example');

    expect(await screen.findByRole('option', { name: 'Example GmbH' })).toBeVisible();
  });

  it('shows the empty hint when the search returns nothing', async () => {
    renderCombobox({ onSearch: vi.fn().mockResolvedValue([]) });

    await userEvent.fill(screen.getByPlaceholderText('Firma suchen…'), 'Nichts');

    expect(await screen.findByText('Keine Firmen gefunden')).toBeVisible();
  });

  it('links the clicked entity immediately in instant mode', async () => {
    const onLink = vi.fn().mockResolvedValue(undefined);
    const onLinked = vi.fn();
    renderCombobox({ confirmVariant: 'instant', onLink, onLinked });

    await userEvent.fill(screen.getByPlaceholderText('Firma suchen…'), 'Example');
    await userEvent.click(await screen.findByRole('option', { name: 'Example GmbH' }));

    expect(onLink).toHaveBeenCalledWith(companies[0]);
    expect(onLinked).toHaveBeenCalledOnce();
  });

  it('links only after confirming in dialog mode', async () => {
    const onLink = vi.fn().mockResolvedValue(undefined);
    renderCombobox({
      onLink,
      confirmMessage: (company) => `Firma ${company.name} verknüpfen?`,
    });

    await userEvent.fill(screen.getByPlaceholderText('Firma suchen…'), 'Example');
    await userEvent.click(await screen.findByRole('option', { name: 'Example GmbH' }));

    expect(onLink).not.toHaveBeenCalled();
    expect(await screen.findByText('Firma Example GmbH verknüpfen?')).toBeVisible();

    screen.getByRole('button', { name: 'Bestätigen' }).click();

    expect(onLink).toHaveBeenCalledWith(companies[0]);
  });

  it('renders existing links as removable badges', async () => {
    const onUnlink = vi.fn();
    renderCombobox({
      linkedItems: [{ id: '1', label: 'Example GmbH', onUnlink }],
    });

    expect(screen.getByText('Example GmbH')).toBeVisible();

    await userEvent.click(screen.getByTitle('Verknüpfung lösen'));

    expect(onUnlink).toHaveBeenCalledOnce();
  });
});
