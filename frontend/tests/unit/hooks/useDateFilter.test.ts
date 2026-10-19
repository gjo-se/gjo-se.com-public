/**
 * Tests: useDateFilter – date-range filter whose from/to live in the URL.
 *
 * Covers the restored-range class (custom), custom from/to updates, clearing
 * and the preset path (range resolved + preset label).
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useDateFilter } from '@src/hooks/useDateFilter';

const TABLE_KEY = 'date-filter-test';

describe('useDateFilter', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('starts without a range and without a preset', () => {
    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    expect(result.current.state).toEqual({
      datePreset: null,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('restores a range from the URL as a custom filter', () => {
    window.history.replaceState(null, '', '/?from=2025-01-01&to=2025-01-31');

    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    expect(result.current.state).toEqual({
      datePreset: 'custom',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
    });
  });

  it('applies a custom from date to the URL and state', () => {
    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    act(() => {
      result.current.actions.applyCustomFrom('2025-02-01');
    });

    expect(result.current.state.datePreset).toBe('custom');
    expect(result.current.state.dateFrom).toBe('2025-02-01');
    expect(new URLSearchParams(window.location.search).get('from')).toBe('2025-02-01');
  });

  it('clears the to param when an empty custom to date is applied', () => {
    window.history.replaceState(null, '', '/?from=2025-01-01&to=2025-01-31');
    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    act(() => {
      result.current.actions.applyCustomTo('');
    });

    expect(result.current.state.dateTo).toBeUndefined();
    expect(new URLSearchParams(window.location.search).has('to')).toBe(false);
  });

  it('resolves a preset range and stores both bounds', () => {
    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    act(() => {
      result.current.actions.applyDatePreset('this-week');
    });

    const params = new URLSearchParams(window.location.search);

    expect(result.current.state.datePreset).toBe('this-week');
    expect(result.current.state.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.state.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.get('from')).toBe(result.current.state.dateFrom);
    expect(params.get('to')).toBe(result.current.state.dateTo);
  });

  it('clears both bounds and the preset', () => {
    window.history.replaceState(null, '', '/?from=2025-01-01&to=2025-01-31');
    const { result } = renderHook(() => useDateFilter(TABLE_KEY));

    act(() => {
      result.current.actions.clearDateFilter();
    });

    const params = new URLSearchParams(window.location.search);

    expect(result.current.state).toEqual({
      datePreset: null,
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(params.has('from')).toBe(false);
    expect(params.has('to')).toBe(false);
  });
});
