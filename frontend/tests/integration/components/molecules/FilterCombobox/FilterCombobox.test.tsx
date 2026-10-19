import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import FilterCombobox from '@src/components/molecules/FilterCombobox/FilterCombobox';

const items = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'archived', label: 'Archiviert' },
];

describe('FilterCombobox', () => {
  it('shows the selected label as the input placeholder', () => {
    render(
      <FilterCombobox items={items} selectedValue="active" onSelect={vi.fn()} />,
    );

    expect(screen.getByPlaceholderText('Aktiv')).toBeVisible();
  });

  it('reports the chosen option', async () => {
    const onSelect = vi.fn();
    render(<FilterCombobox items={items} selectedValue="" onSelect={onSelect} />);

    const input = screen.getByPlaceholderText('–');
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole('option', { name: 'Archiviert' }));

    expect(onSelect).toHaveBeenCalledWith('archived');
  });

  it('filters the option list by the typed query', async () => {
    render(<FilterCombobox items={items} selectedValue="" onSelect={vi.fn()} />);

    const input = screen.getByPlaceholderText('–');
    await userEvent.click(input);
    await userEvent.fill(input, 'arch');

    expect(await screen.findByRole('option', { name: 'Archiviert' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Aktiv' })).not.toBeInTheDocument();
  });

  it('clears the active filter through the reset control', async () => {
    const onSelect = vi.fn();
    render(
      <FilterCombobox items={items} selectedValue="active" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));

    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('clears the active filter when Escape is pressed', async () => {
    const onSelect = vi.fn();
    render(
      <FilterCombobox items={items} selectedValue="active" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByPlaceholderText('Aktiv'));
    await userEvent.keyboard('{Escape}');

    expect(onSelect).toHaveBeenCalledWith('');
  });
});
