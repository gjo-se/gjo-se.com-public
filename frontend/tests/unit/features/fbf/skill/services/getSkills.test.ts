/**
 * Tests: fetchSkills
 *
 * Combines the paginated list and the total count in one result. The count
 * only receives the free-text query; pagination/sorting stay list-only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@src/lib/api/axios', () => ({ default: http, api: http }));

import { fetchSkills } from '@src/features/fbf/skill/services/getSkills';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('fetchSkills', () => {
  it('kombiniert List- und Count-Request zu einer Seite', async () => {
    const items = [{ id: 1, name: 'Python', tags: [], project_count: 0 }];
    http.get.mockResolvedValueOnce({ data: items }).mockResolvedValueOnce({ data: 42 });

    const result = await fetchSkills({ offset: 20, limit: 10, sort_by: 'name', sort_order: 'asc' });

    expect(result).toEqual({ items, total: 42 });
    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/skill',
      { params: { offset: 20, limit: 10, sort_by: 'name', sort_order: 'asc' } },
    ]);
    expect(http.get.mock.calls[1]).toEqual(['/admin/fbf/skill/count', { params: {} }]);
  });

  it('reicht die Suche an beide Requests weiter', async () => {
    http.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: 0 });

    await fetchSkills({ q: '  type  ' });

    expect(http.get.mock.calls[0]?.[1]).toEqual({ params: { q: '  type  ' } });
    expect(http.get.mock.calls[1]).toEqual([
      '/admin/fbf/skill/count',
      { params: { q: '  type  ' } },
    ]);
  });

  it('normalisiert leere Parameter zu undefined', async () => {
    http.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: 0 });

    await fetchSkills({ q: '', sort_by: '', sort_order: undefined });

    const { params } = http.get.mock.calls[0]?.[1] as { params: Record<string, unknown> };
    expect(params.q).toBeUndefined();
    expect(params.sort_by).toBeUndefined();
    expect(params.sort_order).toBeUndefined();
  });

  it('schlägt fehl, wenn einer der beiden Requests fehlschlägt', async () => {
    http.get.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('500'));

    await expect(fetchSkills()).rejects.toThrow('500');
  });
});
