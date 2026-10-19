/**
 * Tests: yamlFileService
 *
 * Behaviour: returns the raw YAML text untouched (no parsing) and throws a
 * status-bearing error for non-OK responses. The HTTP boundary is doubled via
 * a fetch spy (system boundary).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchYamlFile } from '@src/features/viscera/services/yamlFileService';

function httpResponse(ok: boolean, body: string, status = 200, statusText = 'OK'): Response {
  return { ok, status, statusText, text: () => Promise.resolve(body) } as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchYamlFile', () => {
  it('returns the raw file content including YAML syntax', async () => {
    const raw = 'id: workspace\nnodes:\n  - a\n';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpResponse(true, raw));

    await expect(fetchYamlFile('/architecture/workspace.yml')).resolves.toBe(raw);
  });

  it('requests exactly the given path', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(httpResponse(true, 'x: 1'));

    await fetchYamlFile('/architecture/nodes/api.yml');

    expect(fetchSpy).toHaveBeenCalledWith('/architecture/nodes/api.yml');
  });

  it('throws with status information for a missing file', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      httpResponse(false, '', 404, 'Not Found'),
    );

    await expect(fetchYamlFile('/architecture/missing.yml')).rejects.toThrow(
      'HTTP 404: Not Found',
    );
  });
});
