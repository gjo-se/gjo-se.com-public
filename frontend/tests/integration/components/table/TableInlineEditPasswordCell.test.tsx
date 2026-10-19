import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableInlineEditPasswordCell from '@src/components/table/TableInlineEditPasswordCell';

describe('TableInlineEditPasswordCell', () => {
  it('renders the value as a masked field', () => {
    render(<TableInlineEditPasswordCell value="secret" onSave={vi.fn()} />);

    expect(screen.getByDisplayValue('secret')).toHaveAttribute('type', 'password');
  });

  it('reveals the value through the toggle', async () => {
    render(<TableInlineEditPasswordCell value="secret" onSave={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Passwort anzeigen' }));

    expect(screen.getByDisplayValue('secret')).toHaveAttribute('type', 'text');
  });

  it('saves the trimmed value on Enter', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditPasswordCell value="secret" onSave={onSave} />);

    await userEvent.fill(screen.getByDisplayValue('secret'), '  neues-passwort  ');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('neues-passwort');
  });

  it('trims the value before saving', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditPasswordCell value="secret" onSave={onSave} />);

    await userEvent.fill(screen.getByDisplayValue('secret'), '  geheim  ');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('geheim');
  });

  it('does not save an empty value', async () => {
    const onSave = vi.fn();
    render(<TableInlineEditPasswordCell value="secret" onSave={onSave} />);

    await userEvent.clear(screen.getByDisplayValue('secret'));
    await userEvent.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('secret')).toBeVisible();
  });
});
