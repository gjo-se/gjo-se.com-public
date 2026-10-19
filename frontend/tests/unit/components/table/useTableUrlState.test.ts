/**
 * Tests: useTableUrlState
 *
 * Verifies the generic URL-as-SSOT owner: registry params init from the URL,
 * default values are omitted, the single localStorage snapshot restores state
 * when the URL is empty, and resetUrlState clears both URL and localStorage
 * across all known and registry params.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTableUrlState, type TableParamRegistry } from '@src/components/table/useTableUrlState';

const TABLE_KEY = 'test';
const STORAGE_KEY = `table-state:${TABLE_KEY}`;

const registry: TableParamRegistry = {
  preset: { default: 'open' },
  job_role_id: {
    default: null,
    parse: (raw: string): number | null => (raw ? Number(raw) : null),
    serialize: (value: unknown): string | undefined => (value == null ? undefined : String(value)),
  },
};

function currentParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  window.history.replaceState(null, '', '/');
});

describe('useTableUrlState – registry init', () => {
  it('initialises a registry param from the URL and parses its type', () => {
    window.history.replaceState(null, '', '/list?preset=favorites&job_role_id=7');

    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    expect(result.current.params.preset).toBe('favorites');
    expect(result.current.params.job_role_id).toBe(7);
  });

  it('falls back to the registry default when the param is absent', () => {
    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    expect(result.current.params.preset).toBe('open');
    expect(result.current.params.job_role_id).toBeNull();
  });
});

describe('useTableUrlState – writing params', () => {
  it('writes a non-default registry param to the URL', () => {
    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    act(() => result.current.setParam('preset', 'archived'));

    expect(currentParams().get('preset')).toBe('archived');
  });

  it('omits a registry param from the URL once it equals the default again', () => {
    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    act(() => result.current.setParam('preset', 'archived'));
    act(() => result.current.setParam('preset', 'open'));

    expect(currentParams().get('preset')).toBeNull();
  });

  it('writes a known param and its localStorage snapshot while omitting defaults', () => {
    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    act(() => result.current.setQ('hello'));

    expect(currentParams().get('q')).toBe('hello');
    expect(currentParams().get('page')).toBeNull();
    const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
    expect(snapshot.q).toBe('hello');
  });
});

describe('useTableUrlState – localStorage restore', () => {
  it('restores all params from localStorage into the URL when the URL is empty', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ q: 'restored', preset: 'favorites' }));

    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));

    expect(result.current.q).toBe('restored');
    expect(result.current.params.preset).toBe('favorites');
    expect(currentParams().get('q')).toBe('restored');
    expect(currentParams().get('preset')).toBe('favorites');
  });
});

describe('useTableUrlState – reset', () => {
  it('clears the URL and localStorage across known and registry params', () => {
    window.history.replaceState(null, '', '/list?q=hello&preset=archived&job_role_id=3');

    const { result } = renderHook(() => useTableUrlState(TABLE_KEY, registry));
    act(() => result.current.resetUrlState());

    expect(window.location.search).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.q).toBe('');
    expect(result.current.params.preset).toBe('open');
    expect(result.current.params.job_role_id).toBeNull();
  });
});
