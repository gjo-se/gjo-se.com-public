import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import Dropdown from '@src/components/molecules/Dropdown/Dropdown';

const items = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('Dropdown', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Dropdown items={items} selectedValue="" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Bitte wählen/ })).toBeVisible();
  });

  it('shows the selected label on the trigger', () => {
    render(<Dropdown items={items} selectedValue="b" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Option B/ })).toBeVisible();
  });

  it('reports the clicked option and closes the list', async () => {
    const onSelect = vi.fn();
    render(<Dropdown items={items} selectedValue="" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /Bitte wählen/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Option A' }));

    expect(onSelect).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters the options in searchable mode', async () => {
    render(
      <Dropdown
        items={items}
        selectedValue=""
        onSelect={vi.fn()}
        searchable
        searchPlaceholder="Suchen..."
      />,
    );

    const input = screen.getByPlaceholderText('Suchen...');
    await userEvent.fill(input, 'Option B');

    expect(await screen.findByRole('option', { name: 'Option B' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Option A' })).not.toBeInTheDocument();
  });

  it('shows an empty hint when the search matches nothing', async () => {
    render(
      <Dropdown
        items={items}
        selectedValue=""
        onSelect={vi.fn()}
        searchable
        searchPlaceholder="Suchen..."
      />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Suchen...'), 'xyz');

    expect(await screen.findByRole('option', { name: 'Keine Ergebnisse' })).toBeVisible();
  });

  it('disables the trigger when disabled', () => {
    render(<Dropdown items={items} selectedValue="" onSelect={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: /Bitte wählen/ })).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
