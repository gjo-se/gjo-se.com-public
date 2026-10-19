/**
 * Tests: useProjectSkills
 *
 * Verifies the proof query for valid project ids, the disabled query for
 * invalid ids, the 404 mapping to `isNotFound`, refetch, and the error state.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectSkills } from '@src/features/fbf/skill/hooks/useProjectSkills';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/query';

import type { ProjectSkillPublicOut } from '@src/features/fbf/skill/services/proof';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const URL = '/public/fbf/projects/5/skills';
const skills = [
  { id: 1, name: 'Python', importance: 5 },
  { id: 2, name: 'FastAPI', importance: 4 },
] as unknown as ProjectSkillPublicOut[];

beforeEach(() => {
  httpBoundary.reset();
});

/**
 * Builds an axios-like 404 error for the boundary fake.
 *
 * @returns Error recognised by `axios.isAxiosError`.
 */
function axiosNotFound(): Error {
  return Object.assign(new Error('Not Found'), {
    isAxiosError: true,
    response: { status: 404 },
  });
}

describe('useProjectSkills', () => {
  it('loads the skills of a valid project', async () => {
    httpBoundary.on('get', URL, () => skills);

    const { result } = renderHook(() => useProjectSkills(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.skills).toHaveLength(2));

    expect(result.current.skills.map((skill) => skill.name)).toEqual(['Python', 'FastAPI']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.isNotFound).toBe(false);
  });

  it('does not query for a non-positive project id', () => {
    const { result } = renderHook(() => useProjectSkills(0), { wrapper: createWrapper() });

    expect(result.current.skills).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(httpBoundary.calls).toEqual([]);
  });

  it('does not query for a non-integer project id', () => {
    const { result } = renderHook(() => useProjectSkills(1.5), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(false);
    expect(httpBoundary.calls).toEqual([]);
  });

  it('maps a 404 response to isNotFound', async () => {
    httpBoundary.on('get', URL, () => { throw axiosNotFound(); });

    const { result } = renderHook(() => useProjectSkills(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current.isNotFound).toBe(true);
    expect(result.current.skills).toEqual([]);
  });

  it('keeps a non-404 error distinct from not-found', async () => {
    httpBoundary.on('get', URL, () => {
      throw Object.assign(new Error('Server Error'), {
        isAxiosError: true,
        response: { status: 500 },
      });
    });

    const { result } = renderHook(() => useProjectSkills(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current.isNotFound).toBe(false);
  });

  it('refetches on demand', async () => {
    httpBoundary.on('get', URL, () => skills);
    const { result } = renderHook(() => useProjectSkills(5), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.skills).toHaveLength(2));

    await result.current.refetch();

    expect(httpBoundary.calls).toHaveLength(2);
  });
});
