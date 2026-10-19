/**
 * Tests: deleteSkillById
 *
 * Targets the per-id admin endpoint and passes the raw HTTP response
 * through so callers can decide on error handling.
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

import { deleteSkillById } from '@src/features/fbf/skill/services/deleteSkill';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('deleteSkillById', () => {
  it('löscht über den ID-spezifischen Endpoint', async () => {
    http.delete.mockResolvedValue({ status: 204 });

    const result = await deleteSkillById(31);

    expect(http.delete.mock.calls[0]).toEqual(['/admin/fbf/skill/31']);
    expect(result).toEqual({ status: 204 });
  });

  it('reicht Fehler weiter', async () => {
    http.delete.mockRejectedValue(new Error('409 assigned'));

    await expect(deleteSkillById(31)).rejects.toThrow('409 assigned');
  });
});
