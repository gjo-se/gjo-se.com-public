import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SelectCombobox from '@src/components/molecules/SelectCombobox/SelectCombobox';

const options = [
  { value: '1', label: 'Grundkenntnisse' },
  { value: '4', label: 'Sehr gut' },
];

describe('SelectCombobox', () => {
  it('shows the current option label as the placeholder', () => {
    render(<SelectCombobox options={options} value={1} onCommit={vi.fn()} />);

    expect(screen.getByPlaceholderText('Grundkenntnisse')).toBeVisible();
  });

  it('commits the numeric value of the selected option', async () => {
    const onCommit = vi.fn();
    render(<SelectCombobox options={options} value={null} onCommit={onCommit} />);

    await userEvent.click(screen.getByPlaceholderText('–'));
    await userEvent.click(await screen.findByRole('option', { name: 'Sehr gut' }));

    expect(onCommit).toHaveBeenCalledWith(4);
  });

  it('filters the options by the typed query', async () => {
    render(<SelectCombobox options={options} value={null} onCommit={vi.fn()} />);

    const input = screen.getByPlaceholderText('–');
    await userEvent.click(input);
    await userEvent.fill(input, 'Sehr');

    expect(await screen.findByRole('option', { name: 'Sehr gut' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Grundkenntnisse' })).not.toBeInTheDocument();
  });

  it('commits null through the clear option', async () => {
    const onCommit = vi.fn();
    render(
      <SelectCombobox
        options={options}
        value={4}
        onCommit={onCommit}
        allowClear
        clearLabel="Keinen Wert setzen"
      />,
    );

    await userEvent.click(screen.getByPlaceholderText('Sehr gut'));
    await userEvent.click(await screen.findByRole('option', { name: 'Keinen Wert setzen' }));

    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it('invokes the escape handler', async () => {
    const onEscape = vi.fn();
    render(
      <SelectCombobox options={options} value={null} onCommit={vi.fn()} onEscape={onEscape} />,
    );

    await userEvent.click(screen.getByPlaceholderText('–'));
    await userEvent.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledOnce();
  });
});
