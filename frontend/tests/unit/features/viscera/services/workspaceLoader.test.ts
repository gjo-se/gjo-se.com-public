/**
 * Tests: workspaceLoader
 *
 * Behaviour of the workspace load: parallel source fetches are merged into a
 * schema-validated workspace, people are derived from `type: person`, missing
 * diagram sources normalize to 'code', partial endpoint failures degrade to
 * empty arrays, and fatal failures surface as a readable error string.
 * The HTTP boundary is doubled via a fetch spy (system boundary).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from '@src/features/viscera/services/workspaceLoader';

interface FakeResponseInit {
  ok: boolean;
  status?: number;
  statusText?: string;
  body?: string;
  jsonBody?: unknown;
}

function response({
  ok,
  status = 200,
  statusText = 'OK',
  body = '',
  jsonBody = {},
}: FakeResponseInit): Response {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(jsonBody),
  } as unknown as Response;
}

interface Routes {
  nodes?: Response;
  workspaceYml?: Response;
  diagrams?: Response;
  edges?: Response;
  groups?: Response;
}

function mockFetch(routes: Routes): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith('/api/v1/admin/viscera/nodes')) {
      return Promise.resolve(routes.nodes ?? response({ ok: true, jsonBody: { objects: [] } }));
    }
    if (url.startsWith('/architecture/workspace.yml')) {
      return Promise.resolve(
        routes.workspaceYml ??
          response({ ok: true, body: 'id: ws\nname: Workspace\ndescription: ""\n' }),
      );
    }
    if (url.startsWith('/api/v1/admin/viscera/diagrams')) {
      return Promise.resolve(routes.diagrams ?? response({ ok: true, jsonBody: [] }));
    }
    if (url.startsWith('/api/v1/admin/viscera/edges')) {
      return Promise.resolve(routes.edges ?? response({ ok: true, jsonBody: [] }));
    }
    if (url.startsWith('/api/v1/admin/viscera/groups')) {
      return Promise.resolve(routes.groups ?? response({ ok: true, jsonBody: [] }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

const DIAGRAM_WITHOUT_SOURCE = {
  key: 'SystemContext',
  name: 'Context',
  type: 'systemContext',
  description: '',
  parent: null,
  base: null,
  layout: 'lr',
  nodes: {},
  status: 'pending',
  scan_meta: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadWorkspace', () => {
  it('merges API data and YAML into a validated workspace', async () => {
    mockFetch({
      nodes: response({
        ok: true,
        jsonBody: {
          objects: [
            { id: 'sys', name: 'System', type: 'system' },
            { id: 'person', name: 'Person', type: 'person' },
          ],
        },
      }),
      diagrams: response({ ok: true, jsonBody: [DIAGRAM_WITHOUT_SOURCE] }),
      groups: response({
        ok: true,
        jsonBody: [{ id: 'grp', name: 'Group', members: ['sys'] }],
      }),
      edges: response({ ok: true, jsonBody: [{ from: 'person', to: 'sys' }] }),
    });

    const result = await loadWorkspace();

    expect(result.error).toBeNull();
    expect(result.workspace).not.toBeNull();
    expect(result.workspace?.objects).toHaveLength(2);
    expect(result.workspace?.people).toEqual([
      expect.objectContaining({ id: 'person', type: 'person' }),
    ]);
    expect(result.workspace?.groups?.[0]).toMatchObject({ id: 'grp', members: ['sys'] });
    expect(result.workspace?.edges?.[0]).toMatchObject({ from: 'person', to: 'sys' });
  });

  it('normalizes a missing diagram source to "code"', async () => {
    mockFetch({ diagrams: response({ ok: true, jsonBody: [DIAGRAM_WITHOUT_SOURCE] }) });

    const result = await loadWorkspace();

    expect(result.workspace?.diagrams?.[0]?.source).toBe('code');
  });

  it('degrades a failing diagrams endpoint to an empty diagram list', async () => {
    mockFetch({
      diagrams: response({ ok: false, status: 500, statusText: 'Server Error' }),
    });

    const result = await loadWorkspace();

    expect(result.error).toBeNull();
    expect(result.workspace?.diagrams).toEqual([]);
  });

  it('returns a status-bearing error when the nodes endpoint fails', async () => {
    mockFetch({
      nodes: response({ ok: false, status: 500, statusText: 'Internal Server Error' }),
    });

    const result = await loadWorkspace();

    expect(result.workspace).toBeNull();
    expect(result.error).toBe(
      'HTTP 500: Internal Server Error (/api/v1/admin/viscera/nodes)',
    );
  });

  it('returns a readable validation error for an invalid workspace', async () => {
    mockFetch({
      workspaceYml: response({ ok: true, body: 'name: Workspace\ndescription: ""\n' }),
    });

    const result = await loadWorkspace();

    expect(result.workspace).toBeNull();
    expect(result.error).toMatch(/^Validierungs-Fehler: /);
    expect(result.error).toContain('id');
  });

  it('surfaces YAML parse errors with the offending path', async () => {
    mockFetch({
      workspaceYml: response({ ok: true, body: 'id: [unclosed' }),
    });

    const result = await loadWorkspace();

    expect(result.workspace).toBeNull();
    expect(result.error).toContain('YAML-Parse-Fehler in /architecture/workspace.yml');
  });

  it('adds the source query to every endpoint for the golden world', async () => {
    const fetchSpy = mockFetch({});

    await loadWorkspace('golden');

    const urls = fetchSpy.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/v1/admin/viscera/nodes?source=golden',
        '/architecture/workspace.yml?source=golden',
        '/api/v1/admin/viscera/diagrams?source=golden',
        '/api/v1/admin/viscera/edges?source=golden',
        '/api/v1/admin/viscera/groups?source=golden',
      ]),
    );
  });

  it('omits the source query for the default code world', async () => {
    const fetchSpy = mockFetch({});

    await loadWorkspace('code');

    const urls = fetchSpy.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls.every((url: string) => !url.includes('source='))).toBe(true);
  });
});
