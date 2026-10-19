/**
 * Tests: deleteJobRoleById
 *
 * Targets the per-id admin endpoint and passes the HTTP response through so
 * callers can react to the status themselves.
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

import { deleteJobRoleById } from '@src/features/fbf/job-role/services/deleteJobRole';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('deleteJobRoleById', () => {
  it('löscht über den ID-spezifischen Endpoint', async () => {
    http.delete.mockResolvedValue({ status: 204 });

    const result = await deleteJobRoleById(17);

    expect(http.delete.mock.calls[0]).toEqual(['/admin/fbf/job-role/17']);
    expect(result).toEqual({ status: 204 });
  });

  it('reicht Fehler an den Aufrufer weiter', async () => {
    http.delete.mockRejectedValue(new Error('409 in use'));

    await expect(deleteJobRoleById(17)).rejects.toThrow('409 in use');
  });
});
