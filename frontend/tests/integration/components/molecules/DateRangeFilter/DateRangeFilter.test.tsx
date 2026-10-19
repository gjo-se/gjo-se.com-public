import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import DateRangeFilter from '@src/components/molecules/DateRangeFilter/DateRangeFilter';
import { MantineProvider } from '@src/providers/mantine/MantineProvider';

function renderFilter(tableKey: string) {
  return render(
    <MantineProvider>
      <DateRangeFilter tableKey={tableKey} />
    </MantineProvider>,
  );
}

describe('DateRangeFilter', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('starts without a range and opens the preset menu', async () => {
    renderFilter('date-range-filter-open');

    await userEvent.click(screen.getByRole('button', { name: 'Datum wählen…' }));

    expect(await screen.findByRole('button', { name: 'Diese Woche' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Letzten Monat' })).toBeInTheDocument();
  });

  it('applies a preset and shows the resolved range on the trigger', async () => {
    renderFilter('date-range-filter-preset');

    await userEvent.click(screen.getByRole('button', { name: 'Datum wählen…' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Diese Woche' }));

    expect(screen.queryByRole('button', { name: 'Datum wählen…' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /–/ })).toBeVisible();
  });

  it('offers a reset only once a range is set', async () => {
    renderFilter('date-range-filter-reset');

    await userEvent.click(screen.getByRole('button', { name: 'Datum wählen…' }));
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Diesen Monat' }));
    await userEvent.click(screen.getByRole('button', { name: /–/ }));

    await userEvent.click(await screen.findByRole('button', { name: 'Zurücksetzen' }));

    expect(screen.getByRole('button', { name: 'Datum wählen…' })).toBeVisible();
  });
});
