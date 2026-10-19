/**
 * Tests: modulesService
 *
 * Behaviour of the L4 import fetch: request parameters, schema-validated
 * response mapping and the two failure modes (HTTP error, invalid payload).
 * The HTTP boundary is doubled via a fetch spy (system boundary).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchModules } from '@src/features/viscera/services/modulesService';

interface FakeHttpResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}

function httpResponse({
  ok,
  status = 200,
  statusText = 'OK',
  json = () => Promise.resolve({}),
}: FakeHttpResponse): Response {
  return { ok, status, statusText, json } as unknown as Response;
}

function validPayload(): unknown {
  return {
    system: 'gjo-se.com',
    generated_at: '2026-01-01T00:00:00Z',
    modules: [
      { name: 'app.api', path: 'app/api.py', imports: ['app.db'], top_level: 'app' },
      { name: 'app.db', path: 'app/db.py', imports: [], top_level: 'app' },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchModules', () => {
  it('requests the imports endpoint scoped to the system', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(httpResponse({ ok: true, json: () => Promise.resolve(validPayload()) }));

    await fetchModules('gjo-se.com');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/v1/admin/viscera/imports?system=gjo-se.com');
  });

  it('adds the top_level parameter when provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(httpResponse({ ok: true, json: () => Promise.resolve(validPayload()) }));

    await fetchModules('gjo-se.com', 'app');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/viscera/imports?system=gjo-se.com&top_level=app',
    );
  });

  it('returns the schema-validated module list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse({ ok: true, json: () => Promise.resolve(validPayload()) }),
    );

    const modules = await fetchModules('gjo-se.com');

    expect(modules).toHaveLength(2);
    expect(modules[0]).toEqual({
      name: 'app.api',
      path: 'app/api.py',
      imports: ['app.db'],
      top_level: 'app',
    });
  });

  it('throws a status-bearing error on a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse({ ok: false, status: 503, statusText: 'Unavailable' }),
    );

    await expect(fetchModules('gjo-se.com')).rejects.toThrow(
      'HTTP 503: Unavailable (/api/v1/admin/viscera/imports)',
    );
  });

  it('throws a validation error when the payload does not match the schema', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse({ ok: true, json: () => Promise.resolve({ modules: 'not-an-array' }) }),
    );

    await expect(fetchModules('gjo-se.com')).rejects.toThrow(/^Validierungs-Fehler:/);
  });
});
