/**
 * Tests: useHomeFocusCards
 *
 * Verifies numbering, the limit, the teaser→impact fallback and the
 * loading/error flags of the home focus chain.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useHomeFocusCards } from '@src/features/portfolio/hooks/useHomeFocusCards';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/wrappers';

const LIST_URL = '/public/portfolio?locale=de';

const projects = [
  { slug: 'a', title: 'Projekt A', sub_title: 'Metapher A', teaser: 'Teaser A', impact_summary: 'Impact A' },
  { slug: 'b', title: 'Projekt B', sub_title: null, teaser: null, impact_summary: 'Impact B' },
  { slug: 'c', title: 'Projekt C', sub_title: 'Metapher C', teaser: 'Teaser C', impact_summary: 'Impact C' },
  { slug: 'd', title: 'Projekt D', sub_title: null, teaser: null, impact_summary: null },
];

beforeEach(() => {
  httpBoundary.reset();
});

describe('useHomeFocusCards', () => {
  it('maps the first three projects with numbered indices', async () => {
    httpBoundary.on('get', LIST_URL, () => projects);
    const { result } = renderHook(() => useHomeFocusCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.phases).toEqual([
      { num: '01', slug: 'a', title: 'Projekt A', subTitle: 'Metapher A', description: 'Teaser A' },
      { num: '02', slug: 'b', title: 'Projekt B', subTitle: undefined, description: 'Impact B' },
      { num: '03', slug: 'c', title: 'Projekt C', subTitle: 'Metapher C', description: 'Teaser C' },
    ]);
    expect(result.current.error).toBe(false);
  });

  it('respects a custom limit', async () => {
    httpBoundary.on('get', LIST_URL, () => projects);
    const { result } = renderHook(() => useHomeFocusCards(2), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.phases).toHaveLength(2));
  });

  it('falls back to an empty description when neither text exists', async () => {
    httpBoundary.on('get', LIST_URL, () => [projects[3]]);
    const { result } = renderHook(() => useHomeFocusCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.phases).toHaveLength(1));
    expect(result.current.phases[0].description).toBe('');
    expect(result.current.phases[0].subTitle).toBeUndefined();
  });

  it('exposes an error and no phases when the request fails', async () => {
    httpBoundary.on('get', LIST_URL, () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => useHomeFocusCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.phases).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
