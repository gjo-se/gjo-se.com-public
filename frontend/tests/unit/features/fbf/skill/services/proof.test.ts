/**
 * Tests: fetchProjectSkills
 *
 * Public proof endpoint per project; a 404 is propagated so the calling hook
 * can flag `isNotFound`.
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

import { fetchProjectSkills } from '@src/features/fbf/skill/services/proof';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('fetchProjectSkills', () => {
  it('lädt die öffentlichen Projekt-Skills', async () => {
    const skills = [{ id: 1, name: 'React' }];
    http.get.mockResolvedValue({ data: skills });

    const result = await fetchProjectSkills(44);

    expect(http.get.mock.calls[0]).toEqual(['/public/fbf/projects/44/skills']);
    expect(result).toEqual(skills);
  });

  it('reicht einen 404 für unbekannte Projekte weiter', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } });

    await expect(fetchProjectSkills(999)).rejects.toEqual({ response: { status: 404 } });
  });
});
