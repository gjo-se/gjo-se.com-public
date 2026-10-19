/**
 * Tests: useProjectSiblings
 *
 * Prüft die Rekonstruktion der Listen-Query aus der Herkunfts-URL und die
 * Weitergabe der prev/next-Ids. Der I/O-Rand (@src/lib/api/aiscope) wird durch
 * einen Fake mit Aufzeichnung ersetzt – geprüft wird der beobachtbare Effekt
 * (die an den Rand übergebene Query) statt einer Mock-Interaktion.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectSiblings } from '@src/features/aiscope/hooks/useProjectSiblings';

// ── Boundary fake (aiscope API) ──────────────────────────────────────────
// Ein einfacher Fake mit Aufzeichnung – kein vi.fn/Mock: die an den I/O-Rand
// übergebene Query ist der beobachtbare Effekt der Query-Rekonstruktion.
interface SiblingsQuery {
  q?: string
  search_term_id?: number
  sort_by: string
  sort_order: 'asc' | 'desc'
  from?: string
  to?: string
  status?: string
  include_archived: boolean
}

interface SiblingsResult {
  prev_id: number | null
  next_id: number | null
}

const boundary = vi.hoisted(() => {
  const calls: { id: number; query: SiblingsQuery }[] = [];
  let result: SiblingsResult = { prev_id: null, next_id: null };
  let failure: Error | null = null;

  const fetchProjectSiblings = (id: number, query: SiblingsQuery): Promise<SiblingsResult> => {
    calls.push({ id, query });
    return failure ? Promise.reject(failure) : Promise.resolve(result);
  };

  return {
    calls,
    fetchProjectSiblings,
    reset(): void {
      calls.length = 0;
      result = { prev_id: null, next_id: null };
      failure = null;
    },
    respondWith(next: SiblingsResult): void {
      result = next;
    },
    failWith(error: Error): void {
      failure = error;
    },
  };
});

vi.mock('@src/lib/api/aiscope', () => ({
  fetchProjectSiblings: boundary.fetchProjectSiblings,
}));

beforeEach(() => {
  boundary.reset();
});

describe('useProjectSiblings – query reconstruction', () => {
  it('reconstructs filter + sort from the origin URL and sends them to the service', async () => {
    const from = '/admin/aiscope/project?q=react&sort=title&order=asc&search_term_id=7&preset=favorites';

    renderHook(() => useProjectSiblings('42', from));

    await waitFor(() => expect(boundary.calls.length).toBe(1));

    expect(boundary.calls[0].id).toBe(42);
    expect(boundary.calls[0].query).toEqual(expect.objectContaining({
      q: 'react',
      search_term_id: 7,
      sort_by: 'title',
      sort_order: 'asc',
      status: 'favorite',
      include_archived: true,
    }));
  });

  it('maps the linkedCount column key to the slave_count backend sort field', async () => {
    renderHook(() => useProjectSiblings('1', '/admin/aiscope/project?sort=linkedCount&order=desc'));

    await waitFor(() => expect(boundary.calls.length).toBe(1));

    expect(boundary.calls[0].query).toEqual(expect.objectContaining({
      sort_by: 'slave_count',
      sort_order: 'desc',
    }));
  });

  it('falls back to defaults (posted_at desc, open preset) without an origin query', async () => {
    renderHook(() => useProjectSiblings('5', undefined));

    await waitFor(() => expect(boundary.calls.length).toBe(1));

    expect(boundary.calls[0].query).toEqual(expect.objectContaining({
      sort_by: 'posted_at',
      sort_order: 'desc',
      include_archived: false,
    }));
  });

  it('treats a lone from date as a single-day range (to = from)', async () => {
    renderHook(() => useProjectSiblings('9', '/admin/aiscope/project?from=2026-07-01'));

    await waitFor(() => expect(boundary.calls.length).toBe(1));

    expect(boundary.calls[0].query).toEqual(expect.objectContaining({
      from: '2026-07-01',
      to: '2026-07-01',
    }));
  });
});

describe('useProjectSiblings – result passthrough', () => {
  it('exposes the loaded prev/next ids', async () => {
    boundary.respondWith({ prev_id: 11, next_id: 13 });

    const { result } = renderHook(() => useProjectSiblings('12', undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prevId).toBe(11);
    expect(result.current.nextId).toBe(13);
  });

  it('fails closed (null/null) when the service rejects', async () => {
    boundary.failWith(new Error('network'));

    const { result } = renderHook(() => useProjectSiblings('12', undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prevId).toBeNull();
    expect(result.current.nextId).toBeNull();
  });

  it('does not call the service without an id', () => {
    renderHook(() => useProjectSiblings(undefined, undefined));

    expect(boundary.calls).toEqual([]);
  });
});
