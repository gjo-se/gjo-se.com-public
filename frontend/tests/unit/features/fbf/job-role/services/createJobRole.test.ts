/**
 * Tests: createJobRole
 *
 * Success returns the created entity; any transport failure is swallowed and
 * reported as null (the caller shows its own validation message).
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

import { createJobRole } from '@src/features/fbf/job-role/services/createJobRole';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('createJobRole', () => {
  it('postet die Eingabe an den Job-Role-Endpoint und gibt die Entität zurück', async () => {
    const created = { id: 4, name: 'Frontend', status: 'pending' };
    http.post.mockResolvedValue({ data: created });

    const result = await createJobRole({ name: 'Frontend', status: 'pending' });

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/job-role',
      { name: 'Frontend', status: 'pending' },
    ]);
    expect(result).toEqual(created);
  });

  it('gibt bei einem Fehler null zurück', async () => {
    http.post.mockRejectedValue(new Error('409 conflict'));

    const result = await createJobRole({ name: 'Frontend', status: 'pending' });

    expect(result).toBeNull();
  });
});
