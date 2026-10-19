/**
 * Tests: adrFileService
 *
 * Behaviour at the public interface: frontmatter parsing (with and without a
 * YAML block, malformed YAML) and the HTTP-file loader's success / not-found /
 * invalid / transport-error outcomes. The HTTP boundary is doubled with a spy
 * on `globalThis.fetch` (system boundary — no module internals are patched).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAdrContent,
  fetchAdrFile,
  parseFrontmatter,
} from '@src/features/viscera/services/adrFileService';

interface FakeHttpResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  body?: string;
}

function httpResponse({ ok, status = 200, statusText = 'OK', body = '' }: FakeHttpResponse): Response {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

const VALID_ADR = `---
id: 7
title: Use the command pattern
status: accepted
date: 2026-01-01
---
# Context

We need undo/redo.
`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseFrontmatter', () => {
  it('returns the whole input as content when no frontmatter block is present', () => {
    const raw = '# Just markdown\n\nNo frontmatter here.';

    const result = parseFrontmatter(raw);

    expect(result.data).toEqual({});
    expect(result.content).toBe(raw);
  });

  it('extracts YAML data and strips the leading blank line from the body', () => {
    const result = parseFrontmatter(VALID_ADR);

    expect(result.data).toEqual({
      id: 7,
      title: 'Use the command pattern',
      status: 'accepted',
      date: '2026-01-01',
    });
    expect(result.content).toBe('# Context\n\nWe need undo/redo.\n');
  });

  it('treats an unterminated frontmatter block as plain content', () => {
    const raw = '---\nid: 1\ntitle: Open';

    const result = parseFrontmatter(raw);

    expect(result.data).toEqual({});
    expect(result.content).toBe(raw);
  });

  it('keeps the body when the YAML inside the block is malformed', () => {
    const raw = '---\nid: [unclosed\n---\nBody text';

    const result = parseFrontmatter(raw);

    expect(result.data).toEqual({});
    expect(result.content).toBe('Body text');
  });
});

describe('fetchAdrFile', () => {
  it('returns a parsed Adr including the id from the filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpResponse({ ok: true, body: VALID_ADR }));

    const adr = await fetchAdrFile('/architecture/adr/0007-command-pattern.md');

    expect(adr).toMatchObject({
      id: 7,
      title: 'Use the command pattern',
      status: 'accepted',
      idString: '0007',
      filePath: '/architecture/adr/0007-command-pattern.md',
    });
    expect(adr?.content).toBe('# Context\n\nWe need undo/redo.\n');
  });

  it('returns null for a non-OK HTTP response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse({ ok: false, status: 404, statusText: 'Not Found' }),
    );

    await expect(fetchAdrFile('/architecture/adr/missing.md')).resolves.toBeNull();
  });

  it('returns null when the frontmatter fails schema validation', async () => {
    const raw = '---\nid: 1\nstatus: nope\n---\nBody';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpResponse({ ok: true, body: raw }));

    await expect(fetchAdrFile('/architecture/adr/invalid.md')).resolves.toBeNull();
  });

  it('returns null when the transport rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(fetchAdrFile('/architecture/adr/0001-x.md')).resolves.toBeNull();
  });
});

describe('fetchAdrContent', () => {
  it('returns the raw markdown text on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpResponse({ ok: true, body: '# Raw' }));

    await expect(fetchAdrContent('/architecture/adr/0001-x.md')).resolves.toBe('# Raw');
  });

  it('throws an error carrying status and status text on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }),
    );

    await expect(fetchAdrContent('/architecture/adr/0001-x.md')).rejects.toThrow(
      'HTTP 500: Internal Server Error',
    );
  });
});
