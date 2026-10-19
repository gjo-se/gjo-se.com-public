/**
 * Tests: job-role curation service
 *
 * Endpoint targets, query defaults (limit 5000) and the preserve-status PUT
 * body are the observable contract with the backend.
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

import {
  confirmJobRoles,
  fetchAdminJobRoles,
  fetchConfirmedJobRoles,
  reassignJobRole,
  updateJobRoleName,
} from '@src/features/fbf/job-role/services/curation';

import type { JobRoleAdminOut } from '@src/features/fbf/job-role/services/curation';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('confirmJobRoles', () => {
  it('bestätigt die IDs und gibt die Anzahl der Übergänge zurück', async () => {
    http.post.mockResolvedValue({ data: 2 });

    const result = await confirmJobRoles([1, 3]);

    expect(http.post.mock.calls[0]).toEqual(['/admin/fbf/job-role/confirm', { ids: [1, 3] }]);
    expect(result).toBe(2);
  });
});

describe('job-role reads', () => {
  it('lädt ohne Statusfilter alle Rollen mit Limit 5000', async () => {
    const roles: JobRoleAdminOut[] = [{ id: 1, name: 'Frontend', project_count: 2 }];
    http.get.mockResolvedValue({ data: roles });

    const result = await fetchAdminJobRoles();

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/job-role',
      { params: { limit: 5000 } },
    ]);
    expect(result).toEqual(roles);
  });

  it('reicht einen expliziten Statusfilter durch', async () => {
    http.get.mockResolvedValue({ data: [] });

    await fetchAdminJobRoles({ status: 'pending' });

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/job-role',
      { params: { status: 'pending', limit: 5000 } },
    ]);
  });

  it('lädt nur aktive Rollen für die Reassign-Auswahl', async () => {
    http.get.mockResolvedValue({ data: [] });

    await fetchConfirmedJobRoles();

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/job-role',
      { params: { status: 'active', limit: 5000 } },
    ]);
  });
});

describe('reassignJobRole', () => {
  it('sendet das Ziel als target_id und gibt die Anzahl der Änderungen zurück', async () => {
    http.post.mockResolvedValue({ data: 5 });

    const result = await reassignJobRole(7, 9);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/job-role/7/reassign',
      { target_id: 9 },
    ]);
    expect(result).toBe(5);
  });

  it('sendet null, wenn die Verknüpfungen entfernt werden sollen', async () => {
    http.post.mockResolvedValue({ data: 0 });

    await reassignJobRole(7, null);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/job-role/7/reassign',
      { target_id: null },
    ]);
  });
});

describe('updateJobRoleName', () => {
  it('benennt um und behält den aktuellen Status bei', async () => {
    const role: JobRoleAdminOut = {
      id: 7,
      name: 'Alt',
      project_count: 1,
      status: 'active',
      status_color_token: 'green',
    };
    http.put.mockResolvedValue({ data: { ...role, name: 'Neu' } });

    const result = await updateJobRoleName(role, 'Neu');

    expect(http.put.mock.calls[0]).toEqual([
      '/admin/fbf/job-role/7',
      { name: 'Neu', status: 'active' },
    ]);
    expect(result).toEqual({ ...role, name: 'Neu' });
  });
});
