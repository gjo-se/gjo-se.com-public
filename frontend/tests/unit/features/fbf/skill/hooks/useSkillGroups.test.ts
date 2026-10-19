/**
 * Tests: useSkillGroups
 *
 * Verifies the locale-derived group query (URL is the language source of
 * truth), the exposed groups, and the error/empty behaviour.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillGroups } from '@src/features/fbf/skill/hooks/useSkillGroups';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/query';

import type { SkillGroupOut } from '@src/features/fbf/skill/services/skills';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const GROUPS_URL = '/public/fbf/skill-group';
const groups = [
  { id: 1, label: 'AI', sort: 1 },
  { id: 2, label: 'Architecture', sort: 2 },
] as SkillGroupOut[];

beforeEach(() => {
  httpBoundary.reset();
  httpBoundary.on('get', GROUPS_URL, () => groups);
});

describe('useSkillGroups', () => {
  it('loads the German groups for a non-English route', async () => {
    const { result } = renderHook(() => useSkillGroups(), { wrapper: createWrapper(['/']) });

    await waitFor(() => expect(result.current.groups).toHaveLength(2));

    expect(result.current.groups.map((group) => group.label)).toEqual(['AI', 'Architecture']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(httpBoundary.calls[0].params).toEqual({ locale: 'de' });
  });

  it('loads the English groups under /en', async () => {
    const { result } = renderHook(() => useSkillGroups(), { wrapper: createWrapper(['/en']) });

    await waitFor(() => expect(result.current.groups).toHaveLength(2));

    expect(httpBoundary.calls[0].params).toEqual({ locale: 'en' });
  });

  it('reports an error and keeps an empty group list on failure', async () => {
    httpBoundary.on('get', GROUPS_URL, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useSkillGroups(), { wrapper: createWrapper(['/']) });

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current.groups).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
