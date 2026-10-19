import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useTechnologyCatalogTable } from '@src/features/technology-catalog/hooks/useTechnologyCatalogTable';

function renderTableHook() {
  return renderHook(() => useTechnologyCatalogTable(), {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });
}

describe('useTechnologyCatalogTable', () => {
  it('loads the technology rows and total', async () => {
    const { result } = renderTableHook();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toHaveLength(1);
    expect(result.current.table.data[0].slug).toBe('typescript');
    expect(result.current.table.total).toBe(1);
  });

  it('exposes the catalog columns and filter options', async () => {
    const { result } = renderTableHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.columns).toHaveProperty('name');
    expect(result.current.columns).toHaveProperty('icon');
    expect(result.current.columns).toHaveProperty('status');
    expect(result.current.providerOptions.some((o) => o.value === 'aws')).toBe(true);
    expect(result.current.typeOptions.some((o) => o.value === 'language')).toBe(true);
  });

  it('loads the icon counts from the API', async () => {
    const { result } = renderTableHook();

    await waitFor(() => expect(result.current.iconCounts.total).toBe(1));
    expect(result.current.iconCounts).toEqual({ loaded: 0, total: 1 });
  });

  it('filters entries without icons in the missing mode', async () => {
    const { result } = renderTableHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onIconFilterChange('missing'));

    expect(result.current.table.data).toHaveLength(1);

    act(() => result.current.onIconFilterChange('loaded'));

    expect(result.current.table.data).toHaveLength(0);
  });

  it('keeps the empty filters when the provider changes', async () => {
    const { result } = renderTableHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onProviderFilterChange('aws'));

    expect(result.current.providerFilter).toBe('aws');
  });
});
