import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';

describe('StatusFilter', () => {
  it('renders the status label and the all-option before the catalog loads', async () => {
    render(<StatusFilter statusableType="fbf_skill" selectedValue="" onSelect={vi.fn()} />);

    expect(screen.getByText('Status:')).toBeVisible();
    expect(screen.getByRole('button', { name: /Alle/ })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: /Alle/ })).toBeVisible());
  });

  it('loads the scoped statuses over MSW and offers them in the menu', async () => {
    render(<StatusFilter statusableType="fbf_skill" selectedValue="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Alle/ }));

    await waitFor(() => expect(screen.getByRole('option', { name: 'Aktiv' })).toBeVisible());
  });

  it('reports the selected status', async () => {
    const onSelect = vi.fn();
    render(<StatusFilter statusableType="fbf_skill" selectedValue="" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /Alle/ }));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Aktiv' })).toBeVisible());
    await userEvent.click(screen.getByRole('option', { name: 'Aktiv' }));

    expect(onSelect).toHaveBeenCalledWith('Aktiv');
  });

  it('shows the current selection label', () => {
    render(<StatusFilter statusableType="fbf_skill" selectedValue="Aktiv" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Aktiv/ })).toBeVisible();
  });
});
