/**
 * Tests: useModelExplorerSearch
 *
 * Verifies the combined type/parent filtering and the debounced fuzzy search
 * at the hook's public interface.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useModelExplorerSearch } from '@src/features/viscera/explorer/hooks/useModelExplorerSearch';

import {
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
} from '../../helpers';

const wrapper = makeWorkspaceWrapper(
  makeWorkspace({
    objects: [
      makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
      makeObject({ id: 'api', name: 'API Gateway', type: 'container', parent: 'backend' }),
      makeObject({ id: 'worker', name: 'Worker', type: 'component', parent: 'api' }),
      makeObject({ id: 'legacy', name: 'Legacy Worker', type: 'component' }),
    ],
  }),
);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useModelExplorerSearch', () => {
  it('returns all objects with the default filters', () => {
    const { result } = renderHook(() => useModelExplorerSearch(), { wrapper });

    expect(result.current.filtered.map((o) => o.id)).toEqual([
      'backend',
      'api',
      'worker',
      'legacy',
    ]);
    expect(result.current.typeFilter).toBe('all');
    expect(result.current.parentFilter).toBe('all');
  });

  it('filters objects by type', () => {
    const { result } = renderHook(() => useModelExplorerSearch(), { wrapper });

    act(() => result.current.setTypeFilter('component'));

    expect(result.current.filtered.map((o) => o.id)).toEqual(['worker', 'legacy']);
  });

  it('filters objects by parent presence', () => {
    const { result } = renderHook(() => useModelExplorerSearch(), { wrapper });

    act(() => result.current.setParentFilter('withParent'));
    expect(result.current.filtered.map((o) => o.id)).toEqual(['api', 'worker']);

    act(() => result.current.setParentFilter('withoutParent'));
    expect(result.current.filtered.map((o) => o.id)).toEqual(['backend', 'legacy']);
  });

  it('applies the fuzzy query after the debounce window', () => {
    const { result } = renderHook(() => useModelExplorerSearch(), { wrapper });

    act(() => result.current.handleSearch('worker'));
    expect(result.current.filtered.map((o) => o.id)).toEqual([
      'backend',
      'api',
      'worker',
      'legacy',
    ]);

    act(() => vi.advanceTimersByTime(150));

    expect(result.current.query).toBe('worker');
    expect(result.current.filtered.map((o) => o.id)).toEqual(['worker', 'legacy']);
  });

  it('clears search results for a whitespace-only query', () => {
    const { result } = renderHook(() => useModelExplorerSearch(), { wrapper });

    act(() => result.current.handleSearch('worker'));
    act(() => vi.advanceTimersByTime(150));
    act(() => result.current.handleSearch('   '));

    expect(result.current.filtered.map((o) => o.id)).toEqual([
      'backend',
      'api',
      'worker',
      'legacy',
    ]);
  });
});
