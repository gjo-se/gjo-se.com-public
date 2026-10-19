/**
 * Tests: useSkillList
 *
 * Verifies the public skill list is requested with `grouped_only`, exposed as
 * `items`, and that failures surface as `error` without data.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillList } from '@src/features/fbf/skill/hooks/useSkillList';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/query';

import type { SkillPublicOut } from '@src/features/fbf/skill/services/skills';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const LIST_URL = '/public/fbf/skill';

const python = { id: 10, name: 'Python', group_id: 1, importance: 5, sort: 1 } as unknown as SkillPublicOut;
const typescript = { id: 11, name: 'TypeScript', group_id: 1, importance: 4, sort: 2 } as unknown as SkillPublicOut;

beforeEach(() => {
  httpBoundary.reset();
});

describe('useSkillList', () => {
  it('loads the grouped public skill list', async () => {
    httpBoundary.on('get', LIST_URL, () => [python, typescript]);

    const { result } = renderHook(() => useSkillList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.items.map((item) => item.name)).toEqual(['Python', 'TypeScript']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(httpBoundary.calls[0].params).toEqual({ grouped_only: true });
  });

  it('exposes an empty list while the request is pending', () => {
    httpBoundary.on('get', LIST_URL, () => new Promise(() => undefined));

    const { result } = renderHook(() => useSkillList(), { wrapper: createWrapper() });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('reports an error and keeps an empty list when the request fails', async () => {
    httpBoundary.on('get', LIST_URL, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useSkillList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
