/**
 * Tests: useHomeSkillGroups
 *
 * Verifies the home teaser derivation: groups sorted by `sort`, groups without
 * skills skipped, the limit applied, counts and top-badge order, plus loading
 * and error propagation.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHomeSkillGroups } from '@src/features/fbf/skill/hooks/useHomeSkillGroups';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/query';

import type { SkillGroupOut } from '@src/features/fbf/skill/services/skills';
import type { SkillPublicOut } from '@src/features/fbf/skill/services/skills';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const GROUPS_URL = '/public/fbf/skill-group';
const LIST_URL = '/public/fbf/skill';

const groups = [
  { id: 1, label: 'AI', sort: 2 },
  { id: 2, label: 'Architecture', sort: 1 },
  { id: 3, label: 'Empty', sort: 3 },
] as SkillGroupOut[];

const skills = [
  { id: 10, name: 'Python', group_id: 1, importance: 5, sort: 1 },
  { id: 11, name: 'LLM', group_id: 1, importance: 4, sort: 2 },
  { id: 12, name: 'DDD', group_id: 2, importance: 3, sort: 1 },
  { id: 13, name: 'Ungrouped', group_id: null, importance: 5, sort: 1 },
] as unknown as SkillPublicOut[];

beforeEach(() => {
  httpBoundary.reset();
  httpBoundary.on('get', GROUPS_URL, () => groups);
  httpBoundary.on('get', LIST_URL, () => skills);
});

describe('useHomeSkillGroups', () => {
  it('builds cards sorted by group sort and skips empty groups', async () => {
    const { result } = renderHook(() => useHomeSkillGroups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    expect(result.current.cards.map((card) => card.title)).toEqual(['Architecture', 'AI']);
    expect(result.current.cards.map((card) => card.count)).toEqual([1, 2]);
  });

  it('orders the badges by curated sort and importance', async () => {
    const { result } = renderHook(() => useHomeSkillGroups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    expect(result.current.cards[1].badges).toEqual(['Python', 'LLM']);
  });

  it('applies the limit to the first groups in sort order', async () => {
    const { result } = renderHook(() => useHomeSkillGroups(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    expect(result.current.cards[0]).toEqual({
      id: 2,
      title: 'Architecture',
      count: 1,
      badges: ['DDD'],
    });
  });

  it('ignores skills without a group', async () => {
    const { result } = renderHook(() => useHomeSkillGroups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    expect(result.current.cards.flatMap((card) => card.badges)).not.toContain('Ungrouped');
  });

  it('reports loading while either query is pending', () => {
    httpBoundary.on('get', GROUPS_URL, () => new Promise(() => undefined));

    const { result } = renderHook(() => useHomeSkillGroups(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    expect(result.current.cards).toEqual([]);
  });

  it('reports an error when the group query fails', async () => {
    httpBoundary.on('get', GROUPS_URL, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useHomeSkillGroups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current.cards).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
