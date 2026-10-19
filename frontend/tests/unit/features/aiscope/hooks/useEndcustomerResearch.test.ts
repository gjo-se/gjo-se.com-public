/**
 * Tests: useEndcustomerResearch – Kandidaten-Lebenszyklus am Hook-Interface.
 *
 * Gefakt ist nur die I/O-Grenze (`@src/lib/api/aiscopeEndcustomer`).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEndcustomerResearch } from '@src/features/aiscope/hooks/useEndcustomerResearch';

const api = vi.hoisted(() => ({
  getCandidates: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
}));

vi.mock('@src/lib/api/aiscopeEndcustomer', () => ({
  getProjectEndcustomerCandidates: api.getCandidates,
  postConfirmCandidate: api.confirm,
  postRejectCandidate: api.reject,
}));

const candidate = (id: number, confidence: number | null) => ({
  id,
  project_id: 1,
  company_name: `Firma ${id}`,
  website: null,
  career_page_url: null,
  confidence,
  source: 'web',
  career_page_description: null,
  similarity_to_project: null,
  reasoning: null,
  status: 'pending',
  status_color_token: null,
  created_at: '2026-01-01T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEndcustomerResearch', () => {
  it('starts without candidates and without loading', () => {
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    expect(result.current.candidates).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('loads candidates and drops results below the confidence floor', async () => {
    api.getCandidates.mockResolvedValue([candidate(1, 0.9), candidate(2, 0.1), candidate(3, null)]);
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    await act(async () => {
      await result.current.loadCandidates();
    });

    expect(result.current.candidates.map((c) => c.id)).toEqual([1]);
    expect(result.current.loading).toBe(false);
  });

  it('keeps the previous list when loading fails', async () => {
    api.getCandidates.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    await act(async () => {
      await result.current.loadCandidates();
    });

    expect(result.current.candidates).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('removes a confirmed candidate from the list', async () => {
    api.getCandidates.mockResolvedValue([candidate(1, 0.9), candidate(2, 0.8)]);
    api.confirm.mockResolvedValue({ company_id: 1, person_id: 1, slave_id: 1 });
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    await act(async () => {
      await result.current.loadCandidates();
    });
    await act(async () => {
      await result.current.handleConfirm(1);
    });

    expect(result.current.candidates.map((c) => c.id)).toEqual([2]);
  });

  it('removes a rejected candidate from the list', async () => {
    api.getCandidates.mockResolvedValue([candidate(1, 0.9)]);
    api.reject.mockResolvedValue(undefined);
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    await act(async () => {
      await result.current.loadCandidates();
    });
    await act(async () => {
      await result.current.handleReject(1);
    });

    expect(result.current.candidates).toEqual([]);
  });

  it('keeps the candidate when the confirmation request fails', async () => {
    api.getCandidates.mockResolvedValue([candidate(1, 0.9)]);
    api.confirm.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useEndcustomerResearch(1, false));

    await act(async () => {
      await result.current.loadCandidates();
    });
    await act(async () => {
      await result.current.handleConfirm(1);
    });

    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
  });
});
