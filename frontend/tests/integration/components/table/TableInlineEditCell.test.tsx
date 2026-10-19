import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableInlineEditCell from '@src/components/table/TableInlineEditCell';

describe('TableInlineEditCell', () => {
  it('shows the value and enters edit mode on click', async () => {
    render(<TableInlineEditCell value="Alt" onSave={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Alt' }));

    expect(screen.getByRole('textbox')).toHaveValue('Alt');
  });

  it('shows the empty placeholder', () => {
    render(<TableInlineEditCell value="" onSave={vi.fn()} emptyPlaceholder="leer" />);

    expect(screen.getByRole('button', { name: 'leer' })).toBeVisible();
  });

  it('saves a changed value on Enter', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditCell value="Alt" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Alt' }));
    await userEvent.fill(screen.getByRole('textbox'), 'Neu');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('Neu');
  });

  it('does not save an unchanged value', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditCell value="Alt" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Alt' }));
    await userEvent.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('reverts the draft on Escape', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditCell value="Alt" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Alt' }));
    await userEvent.fill(screen.getByRole('textbox'), 'Neu');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Alt' })).toBeVisible();
  });

  it('uses a textarea in textarea mode and saves with Ctrl+Enter', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditCell value="Alt" onSave={onSave} textarea />);

    await userEvent.click(screen.getByRole('button', { name: 'Alt' }));
    await userEvent.fill(screen.getByRole('textbox'), 'Zeile 1\nZeile 2');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith('Zeile 1\nZeile 2');
  });
});
