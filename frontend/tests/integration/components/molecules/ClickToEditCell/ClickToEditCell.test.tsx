import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ClickToEditCell from '@src/components/molecules/ClickToEditCell/ClickToEditCell';

describe('ClickToEditCell', () => {
  it('shows the current value and enters edit mode on click', async () => {
    render(<ClickToEditCell value="Berlin" onSave={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));

    expect(screen.getByRole('textbox')).toHaveValue('Berlin');
  });

  it('saves the edited value on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ClickToEditCell value="Berlin" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    await userEvent.fill(screen.getByRole('textbox'), 'Hamburg');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('Hamburg');
  });

  it('does not save an unchanged value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ClickToEditCell value="Berlin" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    await userEvent.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('discards the draft on Escape', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ClickToEditCell value="Berlin" onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    await userEvent.fill(screen.getByRole('textbox'), 'Hamburg');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Berlin' })).toBeVisible();
  });
});
