/**
 * Tests: adminAiscopeService – scraper endpoints
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProjectCount, fetchProjects, runScraper, setProjectStatus } from '@src/lib/api/aiscope';

// ── Boundary fake (HTTP-Rand `@src/lib/api/axios`) ────────────────────────
// Ein Fake mit Aufzeichnung (kein `vi.fn`-Mock): die an den Rand übergebene
// Anfrage ist der beobachtbare Effekt des Service – geprüft werden die
// aufgezeichneten Werte, nicht eine Mock-Interaktion.
const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'post' | 'patch'
    url: string
    payload?: unknown
  }

  const calls: RecordedCall[] = [];
  let data: unknown = undefined;

  const record =
    (method: RecordedCall['method']) =>
      (url: string, payload?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method, url, payload });
        return Promise.resolve({ data });
      };

  return {
    calls,
    api: {
      get: record('get'),
      post: record('post'),
      patch: record('patch'),
    },
    reset(): void {
      calls.length = 0;
      data = undefined;
    },
    respondWith(next: unknown): void {
      data = next;
    },
  };
});

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

beforeEach(() => {
  http.reset();
});

describe('runScraper', () => {
  it('posts max_results to the unified scraper endpoint and returns the result', async () => {
    http.respondWith({ status: 'done', saved: 3 });

    const result = await runScraper(20, false);

    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/fbf/scraper/run',
      payload: { max_results: 20 },
    });
    expect(result).toEqual({ status: 'done', saved: 3 });
  });

  it('sends an empty body when no optional params are given', async () => {
    await runScraper();

    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/fbf/scraper/run',
      payload: {},
    });
  });

  it('sends only max_results when forceAll is false', async () => {
    await runScraper(50, false);

    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/fbf/scraper/run',
      payload: { max_results: 50 },
    });
  });

  it('sends force_full when forceAll is true', async () => {
    await runScraper(undefined, true);

    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/fbf/scraper/run',
      payload: { force_full: true },
    });
  });
});

describe('fetchProjects', () => {
  it('forwards status and include_archived as query params', async () => {
    await fetchProjects({ status: 'favorite', include_archived: true });

    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/fbf/projects',
      payload: { params: { status: 'favorite', include_archived: true } },
    });
  });
});

describe('fetchProjectCount', () => {
  it('returns the total count from the count endpoint', async () => {
    http.respondWith({ total: 5 });

    const total = await fetchProjectCount({ include_archived: false });

    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/fbf/projects/count',
      payload: { params: { include_archived: false } },
    });
    expect(total).toBe(5);
  });
});

describe('setProjectStatus', () => {
  it('patches the status endpoint with the new status body', async () => {
    await setProjectStatus(3, 'archived');

    expect(http.calls[0]).toEqual({
      method: 'patch',
      url: '/admin/fbf/projects/3/status',
      payload: { status: 'archived' },
    });
  });
});
