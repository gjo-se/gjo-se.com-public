/**
 * Tests: adrCatalogService
 *
 * Behaviour: all discovered ADR paths are fetched and successful results are
 * returned in file order, while failed/invalid files are filtered out (never
 * surfaced as null entries). The virtual path list and the HTTP boundary are
 * doubled (both are system boundaries).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const hoistedPaths = vi.hoisted(() => ({ paths: [] as string[] }));

vi.mock('virtual:adr-files', () => ({
  default: hoistedPaths.paths,
}));

import { loadAllAdrs } from '@src/features/viscera/services/adrCatalogService';

interface FakeHttpResponse {
  ok: boolean;
  body?: string;
}

function httpResponse({ ok, body = '' }: FakeHttpResponse): Response {
  return { ok, text: () => Promise.resolve(body) } as unknown as Response;
}

function adrMarkdown(id: number, title: string): string {
  return `---\nid: ${id}\ntitle: ${title}\nstatus: accepted\ndate: 2026-01-01\n---\n# ${title}\n`;
}

afterEach(() => {
  vi.restoreAllMocks();
  hoistedPaths.paths.length = 0;
});

describe('loadAllAdrs', () => {
  it('loads every discovered file in order', async () => {
    hoistedPaths.paths.push('/adr/0001-a.md', '/adr/0002-b.md');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(httpResponse({ ok: true, body: adrMarkdown(1, 'First') }))
      .mockResolvedValueOnce(httpResponse({ ok: true, body: adrMarkdown(2, 'Second') }));

    const adrs = await loadAllAdrs();

    expect(adrs.map((adr) => [adr.idString, adr.title])).toEqual([
      ['0001', 'First'],
      ['0002', 'Second'],
    ]);
  });

  it('filters out files whose HTTP request fails', async () => {
    hoistedPaths.paths.push('/adr/0001-a.md', '/adr/0002-missing.md');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(httpResponse({ ok: true, body: adrMarkdown(1, 'First') }))
      .mockResolvedValueOnce(httpResponse({ ok: false }));

    const adrs = await loadAllAdrs();

    expect(adrs).toHaveLength(1);
    expect(adrs[0]?.filePath).toBe('/adr/0001-a.md');
  });

  it('returns an empty list when every file fails', async () => {
    hoistedPaths.paths.push('/adr/0001-a.md', '/adr/0002-b.md');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpResponse({ ok: false }));

    await expect(loadAllAdrs()).resolves.toEqual([]);
  });

  it('returns an empty list when no ADR file is discovered', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(loadAllAdrs()).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
