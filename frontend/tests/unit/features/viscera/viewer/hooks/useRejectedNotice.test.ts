/**
 * Tests: useRejectedNotice
 *
 * Verifies the rejection notice payload at the API boundary: detail fields are
 * serialized into the YAML fragment, the object id falls back to the name, and
 * the API response is returned to the caller.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRejectedNotice } from '@src/features/viscera/viewer/hooks/useRejectedNotice';

import type { ObjectDetail } from '@src/features/viscera/viewer/hooks/useObjectDetail';

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@src/lib/api/axios', () => ({ api: { post: apiMock.post } }));

function makeDetail(patch: Partial<ObjectDetail> = {}): ObjectDetail {
  return {
    objectId: 'backend.api',
    name: 'API',
    type: 'container',
    description: 'HTTP API',
    tags: [],
    technologies: ['fastapi'],
    status: 'viscera-pending',
    parentId: 'backend',
    parentName: 'Backend',
    scope: 'Backend',
    diagrams: [],
    flows: [],
    childrenCount: 0,
    annotations: [],
    technologyCandidates: [],
    typeLabel: 'Container',
    typeOptions: [],
    fields: [{ label: 'Name', value: 'API', field: 'name' }],
    isDerived: false,
    ...patch,
  };
}

beforeEach(() => {
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue({ data: { noticeId: 'notice-1', status: 'queued' } });
});

describe('useRejectedNotice', () => {
  it('posts the object detail as a yaml fragment', async () => {
    const { result } = renderHook(() => useRejectedNotice());

    await result.current.sendRejectedNotice(makeDetail(), 'wrong layer', 'check the parent');

    const payload = apiMock.post.mock.calls[0]?.[1] as {
      objectId: string;
      objectType: string;
      yamlFragment: string;
      reason: string;
      promptSuggestion: string;
      context: { diagram: string; edges: string[] };
    };
    expect(payload.objectId).toBe('backend.api');
    expect(payload.objectType).toBe('Container');
    expect(payload.reason).toBe('wrong layer');
    expect(payload.promptSuggestion).toBe('check the parent');
    expect(payload.context).toEqual({ diagram: 'workspace.yml', edges: [] });

    const fragment = JSON.parse(payload.yamlFragment) as Record<string, unknown>;
    expect(fragment).toMatchObject({
      id: 'backend.api',
      name: 'API',
      type: 'Container',
      description: 'HTTP API',
    });
    expect(fragment.name).toBe('API');
    expect(fragment.technology).toEqual(['fastapi']);
  });

  it('falls back to the display name when no object id exists', async () => {
    const { result } = renderHook(() => useRejectedNotice());

    await result.current.sendRejectedNotice(makeDetail({ objectId: null }), 'reason', '');

    const payload = apiMock.post.mock.calls[0]?.[1] as { objectId: string };
    expect(payload.objectId).toBe('API');
  });

  it('returns the api response to the caller', async () => {
    const { result } = renderHook(() => useRejectedNotice());

    const response = await result.current.sendRejectedNotice(makeDetail(), 'reason', '');

    expect(response).toEqual({ noticeId: 'notice-1', status: 'queued' });
    expect(result.current.isSending).toBe(false);
  });
});
