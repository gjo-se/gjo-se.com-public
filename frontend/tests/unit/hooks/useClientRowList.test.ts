/**
 * Tests: useClientRowList – full-collection load, client-side search and reload.
 *
 * Covers the initial load + mapping, the trimmed/lower-case query boundary, the
 * empty-query equivalence class, both error-message variants and reload.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClientRowList } from '@src/hooks/useClientRowList';

interface RawRow {
  id: number
  name: string
}

interface Row {
  id: number
  name: string
}

const mapRow = (raw: RawRow): Row => ({ id: raw.id, name: raw.name });
const filterRow = (row: Row, query: string): boolean => row.name.toLowerCase().includes(query);

function setup(fetchRows: () => Promise<RawRow[]>) {
  return renderHook(() => useClientRowList<Row, RawRow>({ fetchRows, mapRow, filterRow }));
}

describe('useClientRowList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and maps the full collection', async () => {
    const fetchRows = vi.fn().mockResolvedValue([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);

    const { result } = setup(fetchRows);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toEqual([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('filters case-insensitively and ignores surrounding whitespace', async () => {
    const fetchRows = vi.fn().mockResolvedValue([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);
    const { result } = setup(fetchRows);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearch('  ALP ');
    });

    expect(result.current.rows).toEqual([{ id: 1, name: 'Alpha' }]);
    expect(result.current.totalCount).toBe(2);
  });

  it('returns all rows for a whitespace-only query', async () => {
    const fetchRows = vi.fn().mockResolvedValue([{ id: 1, name: 'Alpha' }]);
    const { result } = setup(fetchRows);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearch('   ');
    });

    expect(result.current.rows).toHaveLength(1);
  });

  it('uses the error message of a thrown Error', async () => {
    const fetchRows = vi.fn().mockRejectedValue(new Error('network broken'));

    const { result } = setup(fetchRows);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network broken');
  });

  it('uses a generic message for non-Error rejections', async () => {
    const fetchRows = vi.fn().mockRejectedValue('boom');

    const { result } = setup(fetchRows);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Fehler beim Laden');
  });

  it('reloads and clears a previous error', async () => {
    const fetchRows = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce([{ id: 3, name: 'Gamma' }]);
    const { result } = setup(fetchRows);
    await waitFor(() => expect(result.current.error).toBe('first failure'));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.rows).toEqual([{ id: 3, name: 'Gamma' }]);
  });
});
