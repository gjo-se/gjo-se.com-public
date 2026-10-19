import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import InlineEditCell from '@src/components/table/InlineEditCell';

describe('InlineEditCell', () => {
  it('renders the display via the caller render prop', () => {
    render(<InlineEditCell value="Alt" onSave={vi.fn()} renderDisplay={(value) => <strong>{value}</strong>} />);

    expect(screen.getByText('Alt')).toBeVisible();
  });

  it('opens a textarea and saves the trimmed value with Ctrl+Enter', async () => {
    const onSave = vi.fn();
    render(<InlineEditCell value="Alt" onSave={onSave} renderDisplay={(value) => value} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByRole('textbox'), '  Neu  ');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith('Neu');
  });

  it('opens a labelled input in input mode and saves on Enter', async () => {
    const onSave = vi.fn();
    render(
      <InlineEditCell
        value="Alt"
        onSave={onSave}
        renderDisplay={(value) => value}
        variant="input"
        ariaLabel="Label bearbeiten"
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByRole('textbox', { name: 'Label bearbeiten' }), 'Neu');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('Neu');
  });

  it('cancels with Escape without saving', async () => {
    const onSave = vi.fn();
    render(<InlineEditCell value="Alt" onSave={onSave} renderDisplay={(value) => value} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByRole('textbox'), 'Neu');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Alt')).toBeVisible();
  });
});
