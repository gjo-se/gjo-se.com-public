import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { GhostRowInputCell } from '@src/components/table/GhostRowInputCell';

describe('GhostRowInputCell', () => {
  it('renders the current value and reports input changes', async () => {
    const onChange = vi.fn();
    render(
      <GhostRowInputCell
        field="name"
        data={{ name: 'Alt' }}
        saving={false}
        touched={false}
        placeholder="Name"
        onChange={onChange}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Alt')).toBeVisible();
    await userEvent.fill(screen.getByPlaceholderText('Name'), 'Neu');

    expect(onChange).toHaveBeenCalledWith('name', 'Neu');
  });

  it('shows the required-field error after the row was touched', () => {
    render(
      <GhostRowInputCell
        field="name"
        data={{ name: '  ' }}
        saving={false}
        touched
        required
        placeholder="Name"
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByText('Pflichtfeld')).toBeVisible();
  });

  it('hides the required-field error while untouched', () => {
    render(
      <GhostRowInputCell
        field="name"
        data={{}}
        saving={false}
        touched={false}
        required
        placeholder="Name"
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.queryByText('Pflichtfeld')).not.toBeInTheDocument();
  });

  it('disables the input while saving', () => {
    render(
      <GhostRowInputCell
        field="name"
        data={{}}
        saving
        touched={false}
        placeholder="Name"
        onChange={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Name')).toBeDisabled();
  });
});
