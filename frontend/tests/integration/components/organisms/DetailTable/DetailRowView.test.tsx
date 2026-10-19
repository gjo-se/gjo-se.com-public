import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import DetailRowView from '@src/components/organisms/DetailTable/DetailRowView';

describe('DetailRowView', () => {
  it('renders the label and the value', () => {
    render(<DetailRowView row={{ field: 'city', label: 'Stadt', value: 'Berlin' }} onSave={vi.fn()} />);

    expect(screen.getByText('Stadt')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Berlin' })).toBeVisible();
  });

  it('renders a dash for an empty value', () => {
    render(<DetailRowView row={{ field: 'city', label: 'Stadt', value: '' }} onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: '–' })).toBeVisible();
  });

  it('saves the edited value on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DetailRowView row={{ field: 'city', label: 'Stadt', value: 'Berlin' }} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Hamburg{Enter}');

    expect(onSave).toHaveBeenCalledWith('city', 'Hamburg');
  });

  it('does not save when the value is unchanged', async () => {
    const onSave = vi.fn();
    render(<DetailRowView row={{ field: 'city', label: 'Stadt', value: 'Berlin' }} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    await userEvent.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels editing with Escape', async () => {
    const onSave = vi.fn();
    render(<DetailRowView row={{ field: 'city', label: 'Stadt', value: 'Berlin' }} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Hamburg{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Berlin' })).toBeVisible();
  });

  it('prefers the custom value renderer', () => {
    render(
      <DetailRowView
        row={{
          field: 'link',
          label: 'Website',
          value: 'example.com',
          renderValue: () => <span>Eigene Darstellung</span>,
        }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('Eigene Darstellung')).toBeVisible();
  });
});
