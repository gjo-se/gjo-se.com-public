/**
 * Tests: useSearch
 *
 * Verifies the debounced fuzzy index over workspace objects: result shape and
 * category mapping, top-level view key resolution for nested objects, and the
 * empty-query/no-match behaviour.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearch } from '@src/features/viscera/search/hooks/useSearch';

import { makeObject, makeWorkspace, makeWorkspaceWrapper } from '../../helpers';

const wrapper = makeWorkspaceWrapper(
  makeWorkspace({
    objects: [
      makeObject({ id: 'backend', name: 'Backend Platform', type: 'system' }),
      makeObject({ id: 'api', name: 'HTTP API', type: 'container', parent: 'backend' }),
      makeObject({ id: 'handler', name: 'Request Handler', type: 'component', parent: 'api' }),
      makeObject({ id: 'cache', name: 'Redis Cache', type: 'store', parent: 'backend' }),
    ],
  }),
);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSearch', () => {
  it('starts with an empty result set', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe('');
  });

  it('maps object types to search categories', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.search('HTTP API'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.results[0]).toMatchObject({
      type: 'container',
      id: 'api',
      name: 'HTTP API',
      sourcePath: 'nodes/api.yml',
    });
  });

  it('resolves the top-level system as view key for nested objects', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.search('Request Handler'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.results.find((entry) => entry.id === 'handler')?.viewKey).toBe('backend');

    act(() => result.current.search('Redis Cache'));
    act(() => vi.advanceTimersByTime(300));

    // Stores are indexed as systems, so their own id is the view key.
    expect(result.current.results.find((entry) => entry.id === 'cache')?.viewKey).toBe('cache');
  });

  it('indexes stores without a type as systems', () => {
    const untypedWrapper = makeWorkspaceWrapper(
      makeWorkspace({ objects: [makeObject({ id: 'legacy', name: 'Legacy Box' })] }),
    );
    const { result } = renderHook(() => useSearch(), { wrapper: untypedWrapper });

    act(() => result.current.search('Legacy Box'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.results[0]).toMatchObject({ type: 'system', id: 'legacy' });
  });

  it('clears results for an empty query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });
    act(() => result.current.search('Backend'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.results.length).toBeGreaterThan(0);

    act(() => result.current.search(''));

    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe('');
  });

  it('returns no results for a query without matches', () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => result.current.search('zzzzzzz'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.results).toEqual([]);
  });
});
