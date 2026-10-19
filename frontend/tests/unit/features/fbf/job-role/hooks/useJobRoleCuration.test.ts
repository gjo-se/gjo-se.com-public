/**
 * Tests: useJobRoleCuration
 *
 * Verifies loading, URL-driven status filtering, ghost-row creation, bulk
 * confirmation, delete guards and external reload events at the public hook
 * interface. Only the HTTP boundary is faked.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JOB_ROLES_CHANGED_EVENT,
} from '@src/features/fbf/job-role/hooks/useJobRolePendingCount';
import { useJobRoleCuration } from '@src/features/fbf/job-role/hooks/useJobRoleCuration';

import { httpBoundary } from '../../helpers/httpBoundary';

import type { JobRoleAdminOut } from '@src/features/fbf/job-role/services/curation';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const BASE = '/admin/fbf/job-role';

const pendingRole = {
  id: 1,
  name: 'Developer',
  status: 'pending',
  project_count: 2,
  status_color_token: 'amber',
} as JobRoleAdminOut;
const activeRole = {
  id: 2,
  name: 'Architect',
  status: 'active',
  project_count: 0,
  status_color_token: 'green',
} as JobRoleAdminOut;

let roles: JobRoleAdminOut[] = [];

/**
 * Answers job-role list requests; `status=active` returns the confirmed set.
 *
 * @param call Recorded HTTP call.
 * @returns Matching roles.
 */
function listRoles(call: { params?: Record<string, unknown> }): JobRoleAdminOut[] {
  const status = call.params?.status;
  if (status === 'active') return roles.filter((role) => role.status === 'active');
  if (typeof status === 'string' && status) return roles.filter((role) => role.status === status);
  return roles;
}

beforeEach(() => {
  httpBoundary.reset();
  roles = [pendingRole, activeRole];
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  httpBoundary.on('get', BASE, listRoles);
});

describe('useJobRoleCuration – loading', () => {
  it('loads the job roles into table rows', async () => {
    const { result } = renderHook(() => useJobRoleCuration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((row) => row.name)).toEqual(['Developer', 'Architect']);
    expect(result.current.table.data.map((row) => row.project_count)).toEqual([2, 0]);
    expect(result.current.table.data.map((row) => row.active)).toEqual([false, true]);
    expect(result.current.error).toBeNull();
  });

  it('uses the status filter from the URL', async () => {
    window.history.replaceState(null, '', '/?status=pending');

    const { result } = renderHook(() => useJobRoleCuration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((row) => row.name)).toEqual(['Developer']);
    expect(httpBoundary.calls[0].params).toMatchObject({ status: 'pending', limit: 5000 });
  });

  it('reports the German error when loading fails', async () => {
    httpBoundary.on('get', BASE, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useJobRoleCuration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Job-Rollen.');
    expect(result.current.table.data).toEqual([]);
  });
});

describe('useJobRoleCuration – ghost-row create', () => {
  it('creates a pending role with the trimmed name and reloads', async () => {
    httpBoundary.on('post', BASE, (call) => ({
      id: 3,
      name: (call.payload as { name: string }).name,
      status: 'pending',
    }));
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const loadsBefore = httpBoundary.calls.filter((call) => call.method === 'get').length;

    const created = await result.current.onGhostCreate({ name: '  Data Engineer ' });
    await waitFor(() => expect(
      httpBoundary.calls.filter((call) => call.method === 'get').length,
    ).toBeGreaterThan(loadsBefore));

    expect(created).toMatchObject({ id: 3, name: 'Data Engineer' });
    expect(httpBoundary.calls.find((call) => call.method === 'post')?.payload).toEqual({
      name: 'Data Engineer',
      status: 'pending',
    });
  });

  it('rejects a ghost-row create without a name', async () => {
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: ' ' })).rejects.toThrow('Name ist erforderlich.');
  });

  it('rejects when the create request fails', async () => {
    httpBoundary.on('post', BASE, () => { throw new Error('offline'); });
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: 'QA' })).rejects.toThrow('Fehler beim Anlegen.');
  });
});

describe('useJobRoleCuration – bulk confirm', () => {
  it('confirms only not-yet-active rows and reloads', async () => {
    httpBoundary.on('post', `${BASE}/confirm`, () => 1);
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const confirm = result.current.bulkActions.find((action) => action.key === 'confirm');

    await act(async () => { await confirm?.onAction(result.current.table.data); });

    expect(httpBoundary.calls.find((call) => call.method === 'post')?.payload).toEqual({ ids: [1] });
  });

  it('does nothing when every selected row is already active', async () => {
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const confirm = result.current.bulkActions.find((action) => action.key === 'confirm');
    const activeRows = result.current.table.data.filter((row) => row.active);
    const postsBefore = httpBoundary.calls.filter((call) => call.method === 'post').length;

    await act(async () => { await confirm?.onAction(activeRows); });

    expect(httpBoundary.calls.filter((call) => call.method === 'post')).toHaveLength(postsBefore);
  });
});

describe('useJobRoleCuration – delete', () => {
  it('disables delete while projects reference the role', async () => {
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const rows = result.current.table.data;

    expect(deleteAction?.disabled?.(rows[0])).toBe(true);
    expect(deleteAction?.disabled?.(rows[1])).toBe(false);
  });

  it('deletes an unreferenced role and reloads', async () => {
    httpBoundary.on('delete', `${BASE}/2`, () => {
      roles = roles.filter((role) => role.id !== 2);
      return undefined;
    });
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    const target = result.current.table.data.find((row) => row.id === 2);
    if (!target) throw new Error('Expected the second job-role row');

    await act(async () => { await deleteAction?.onAction(target); });

    expect(httpBoundary.calls.some((call) => call.method === 'delete' && call.url === `${BASE}/2`)).toBe(true);
    await waitFor(() => expect(result.current.table.data.map((row) => row.id)).toEqual([1]));
  });
});

describe('useJobRoleCuration – external events', () => {
  it('reloads when the curation event fires', async () => {
    const { result } = renderHook(() => useJobRoleCuration());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const loadsBefore = httpBoundary.calls.filter((call) => call.method === 'get').length;
    roles = [pendingRole];

    act(() => window.dispatchEvent(new Event(JOB_ROLES_CHANGED_EVENT)));

    await waitFor(() => expect(
      httpBoundary.calls.filter((call) => call.method === 'get').length,
    ).toBeGreaterThan(loadsBefore));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
  });
});
