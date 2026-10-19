/**
 * Tests: useStatusDefinitionTable
 *
 * Verifies the load/sort of statuses, the create payload mapping (trimmed,
 * gray fallback, scope list) and the delete guard for used statuses.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useStatusDefinitionTable } from '@src/features/core/hooks/useStatusDefinitionTable';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/wrappers';

const URL = '/admin/status';

const status = (id: number, category: string, usage = 0) => ({
  id,
  name: `Status ${id}`,
  category,
  color_token: 'gray',
  description: null,
  sort_order: id,
  usage_count: usage,
  scope: [],
});

beforeEach(() => {
  httpBoundary.reset();
});

describe('useStatusDefinitionTable', () => {
  it('loads and sorts the statuses by category (descending default)', async () => {
    httpBoundary.on('get', URL, () => [status(1, 'work'), status(2, 'application')]);

    const { result } = renderHook(() => useStatusDefinitionTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((row) => row.id)).toEqual([1, 2]);
    expect(result.current.table.total).toBe(2);
    expect(result.current.columns).toHaveProperty('color_token');
  });

  it('creates a status from the ghost row with a gray fallback', async () => {
    let gets = 0;
    httpBoundary.on('get', URL, () => {
      gets += 1;
      return [status(1, 'work')];
    });
    httpBoundary.on('post', URL, () => status(9, 'work'));
    const { result } = renderHook(() => useStatusDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({
        name: ' Neu ',
        category: ' work ',
        color_token: '',
        description: ' Beschreibung ',
        scope: 'a, b',
      });
    });

    const post = httpBoundary.calls.find((call) => call.method === 'post');
    expect(post?.payload).toEqual({
      name: 'Neu',
      category: 'work',
      color_token: 'gray',
      description: 'Beschreibung',
      scope: ['a', 'b'],
    });
    expect(gets).toBe(2);
  });

  it('rejects a ghost row without a name', async () => {
    httpBoundary.on('get', URL, () => []);
    const { result } = renderHook(() => useStatusDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: ' ', category: 'work' }))
      .rejects.toThrow('Name ist erforderlich.');
  });

  it('disables delete for a status that is still in use', async () => {
    httpBoundary.on('get', URL, () => [status(1, 'work', 3)]);
    const { result } = renderHook(() => useStatusDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');

    expect(deleteAction?.disabled?.(result.current.table.data[0])).toBe(true);
    expect(deleteAction?.disabledTitle).toBe('Status wird verwendet');
  });
});
