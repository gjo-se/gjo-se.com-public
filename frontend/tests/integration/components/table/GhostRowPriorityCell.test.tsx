import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { GhostRowPriorityCell } from '@src/components/table/GhostRowPriorityCell';

const OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
];

describe('GhostRowPriorityCell', () => {
  it('renders the stored priority', () => {
    render(
      <GhostRowPriorityCell field="priority" data={{ priority: 'high' }} saving={false} options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Priorität' })).toHaveValue('high');
  });

  it('defaults to medium when the field is empty', () => {
    render(
      <GhostRowPriorityCell field="priority" data={{}} saving={false} options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Priorität' })).toHaveValue('medium');
  });

  it('reports the selected priority', async () => {
    const onChange = vi.fn();
    render(
      <GhostRowPriorityCell field="priority" data={{}} saving={false} options={OPTIONS} onChange={onChange} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priorität' }), 'low');

    expect(onChange).toHaveBeenCalledWith('priority', 'low');
  });

  it('disables the select while saving', () => {
    render(
      <GhostRowPriorityCell field="priority" data={{}} saving options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Priorität' })).toBeDisabled();
  });
});
