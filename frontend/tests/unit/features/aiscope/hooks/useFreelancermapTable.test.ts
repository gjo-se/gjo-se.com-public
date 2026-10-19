/**
 * Tests: useFreelancermapTable – Zeilenformat + Tabellen-Vertrag.
 *
 * Gefakt ist nur der I/O-Rand (`@src/lib/api/aiscope`) und navigation.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFreelancermapTable } from '@src/features/aiscope/hooks/useFreelancermapTable';

const api = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  fetchCount: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@src/lib/api/aiscope', () => ({
  fetchFreelancermapProjects: api.fetchProjects,
  fetchFreelancermapCount: api.fetchCount,
}));

vi.mock('react-router', () => ({
  useNavigate: () => api.navigate,
}));

const rawEntry = {
  id: 1,
  external_id: 'fm-1',
  url: 'https://example.com/1',
  title: 'Senior Fullstack Developer',
  description: null,
  agency: null,
  contact_name: null,
  city: null,
  country: null,
  remote_percent: 100,
  contract_type: 'freelance',
  duration: 6,
  start_date: '2026-11-01',
  skills: null,
  industry: null,
  extension_possible: null,
  endcustomer: true,
  search_term_id: null,
  search_term_name: null,
  posted_at: '2026-10-01T08:00:00Z',
  scraped_at: '2026-10-01T09:00:00Z',
  mapped_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useFreelancermapTable', () => {
  it('formats the raw rows with fallbacks', async () => {
    api.fetchProjects.mockResolvedValue([rawEntry]);
    api.fetchCount.mockResolvedValue(1);
    const { result } = renderHook(() => useFreelancermapTable());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      id: 1,
      agency: '–',
      remotePercent: '100 %',
      jobRole: '–',
      mappedAt: 'ausstehend',
      endcustomer: 'x',
    });
    expect(result.current.table.total).toBe(1);
  });

  it('exposes the column definitions', async () => {
    api.fetchProjects.mockResolvedValue([]);
    api.fetchCount.mockResolvedValue(0);
    const { result } = renderHook(() => useFreelancermapTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.columns.title.label).toBe('Titel');
    expect(result.current.columns.agency.label).toBe('Agentur');
    expect(result.current.columns.postedAt.defaultSort).toBe('desc');
  });

  it('navigates to the raw detail page on edit', async () => {
    api.fetchProjects.mockResolvedValue([rawEntry]);
    api.fetchCount.mockResolvedValue(1);
    const { result } = renderHook(() => useFreelancermapTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const editAction = result.current.rowActions.find((a) => a.key === 'edit');
    await editAction?.onAction({ id: 1 } as never);

    expect(api.navigate).toHaveBeenCalledWith(expect.stringContaining('/1'));
  });

  it('surfaces a load error', async () => {
    api.fetchProjects.mockRejectedValue(new Error('offline'));
    api.fetchCount.mockResolvedValue(0);
    const { result } = renderHook(() => useFreelancermapTable());

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
