/**
 * Tests: skillQueries
 *
 * Query keys are the cache contract; each queryFn must call the matching
 * service (observable at the HTTP boundary).
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

import { skillQueries } from '@src/features/fbf/skill/services/queries';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
  http.get.mockResolvedValue({ data: [] });
});

describe('skillQueries.list', () => {
  it('verwendet den Listen-Key mit den Filtern und lädt Liste plus Count', async () => {
    const filters = { offset: 0, limit: 20 };

    const options = skillQueries.list(filters);

    expect(options.queryKey).toEqual(['skills', 'list', filters]);
    await options.queryFn?.({} as never);
    expect(http.get.mock.calls.map((call) => call[0])).toEqual([
      '/admin/fbf/skill',
      '/admin/fbf/skill/count',
    ]);
  });
});

describe('skillQueries.groups', () => {
  it('bindet das Locale in den Key und lädt die Gruppen', async () => {
    const options = skillQueries.groups('en');

    expect(options.queryKey).toEqual(['skill-groups', 'en']);
    await options.queryFn?.({} as never);
    expect(http.get.mock.calls[0]).toEqual([
      '/public/fbf/skill-group',
      { params: { locale: 'en' } },
    ]);
  });
});

describe('skillQueries.detail', () => {
  it('bindet die ID in den Key und lädt den Skill', async () => {
    const options = skillQueries.detail(7);

    expect(options.queryKey).toEqual(['skills', 7]);
    await options.queryFn?.({} as never);
    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/skill/7']);
  });
});
