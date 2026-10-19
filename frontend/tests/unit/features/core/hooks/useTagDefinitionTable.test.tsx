/**
 * Tests: useTagDefinitionTable
 *
 * Verifies the tag load, the selected-tag sheet state and the create payload
 * mapping onto the tagging endpoint.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useTagDefinitionTable } from '@src/features/core/hooks/useTagDefinitionTable';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/wrappers';

const URL = '/admin/tagging/tags';

const tag = {
  id: 5,
  name: 'AI',
  slug: 'ai',
  category: 'topic',
  color_token: 'blue',
  description: null,
  sort_order: 1,
  usage_count: 2,
  scope: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  httpBoundary.reset();
});

describe('useTagDefinitionTable', () => {
  it('loads the tags', async () => {
    httpBoundary.on('get', URL, () => [tag]);

    const { result } = renderHook(() => useTagDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toEqual([tag]);
    expect(result.current.selectedTag).toBeNull();
  });

  it('keeps the selected tag for the usage sheet', async () => {
    httpBoundary.on('get', URL, () => [tag]);
    const { result } = renderHook(() => useTagDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSelectedTag(tag));

    expect(result.current.selectedTag).toEqual(tag);
  });

  it('creates a tag on the tagging endpoint', async () => {
    httpBoundary.on('get', URL, () => [tag]);
    httpBoundary.on('post', URL, () => tag);
    const { result } = renderHook(() => useTagDefinitionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ name: 'Cloud', category: 'topic', color_token: 'green' });
    });

    const post = httpBoundary.calls.find((call) => call.method === 'post');
    expect(post?.payload).toEqual({
      name: 'Cloud',
      category: 'topic',
      color_token: 'green',
      description: null,
      scope: null,
    });
  });
});
