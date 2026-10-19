import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createCompanyAddressColumns } from '@src/features/crm/shared/CompanyAddressColumns';

const addressRow = {
  id: 3,
  label: 'HQ',
  street: 'Hauptstraße 1',
  zip: '10115',
  city: 'Berlin',
  country: 'DE',
  is_primary: true,
};

function renderCell(column: string, row: typeof addressRow, reload = vi.fn()) {
  const columns = createCompanyAddressColumns(7, reload);
  return render(<table><tbody><tr><td>{columns[column].renderCell?.(row)}</td></tr></tbody></table>);
}

describe('createCompanyAddressColumns', () => {
  it('defines the address columns with labels', () => {
    const columns = createCompanyAddressColumns(7, vi.fn());

    expect(columns.street.label).toBe('Straße');
    expect(columns.zip.label).toBe('PLZ');
    expect(columns.city.label).toBe('Stadt');
    expect(columns.country.label).toBe('Land');
    expect(columns.label.label).toBe('Label');
    expect(columns.is_primary.label).toBe('Primär');
  });

  it('shows the current street value', () => {
    renderCell('street', addressRow);

    expect(screen.getByRole('button', { name: 'Hauptstraße 1' })).toBeInTheDocument();
  });

  it('persists an edited city and reloads the table', async () => {
    const reload = vi.fn();
    renderCell('city', addressRow, reload);

    fireEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hamburg' } });
    fireEvent.blur(input);

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('toggles the primary flag and reloads the table', async () => {
    const reload = vi.fn();
    renderCell('is_primary', addressRow, reload);

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
