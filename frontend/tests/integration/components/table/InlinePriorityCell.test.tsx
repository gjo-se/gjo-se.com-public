import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import InlinePriorityCell from '@src/components/table/InlinePriorityCell';

const OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'high', label: 'Hoch' },
];

describe('InlinePriorityCell', () => {
  it('renders the label of the current value', () => {
    render(<InlinePriorityCell value="low" options={OPTIONS} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Niedrig' })).toBeVisible();
  });

  it('falls back to the raw value for unknown options', () => {
    render(<InlinePriorityCell value="unknown" options={OPTIONS} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'unknown' })).toBeVisible();
  });

  it('opens the select and reports the chosen priority', async () => {
    const onChange = vi.fn();
    render(<InlinePriorityCell value="low" options={OPTIONS} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Niedrig' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priorität' }), 'high');

    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('closes the select on Escape', async () => {
    render(<InlinePriorityCell value="low" options={OPTIONS} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Niedrig' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
