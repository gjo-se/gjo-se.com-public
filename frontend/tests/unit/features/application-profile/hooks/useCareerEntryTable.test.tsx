/**
 * Tests: useCareerEntryTable
 *
 * Covers the API→row mapping, client-side search, ghost-create validation,
 * translation-preserving inline edits, reorder and delete.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCareerEntryTable } from '@src/features/application-profile/hooks/useCareerEntryTable';

import { jsonResponse } from '../../helpers/fetchResponse';

const CAREER = '/api/v1/admin/application-profile/career';

const entry = {
  id: 1,
  position: 'Senior Developer',
  company: 'Acme',
  projectUrl: 'https://acme.test',
  startDate: '2024-01-01',
  endDate: null,
  status: 'active',
  status_color_token: 'green',
  translations: {
    de: { description: 'Deutsch' },
    en: { description: 'English' },
  },
};

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

function noContent(): Response {
  return { ok: true, status: 204, statusText: 'No Content', headers: new Headers() } as unknown as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCareerEntryTable', () => {
  it('maps API entries to table rows', async () => {
    stubFetch(() => jsonResponse([entry]));

    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toEqual([
      {
        id: 1,
        position: 'Senior Developer',
        company: 'Acme',
        project_url: 'https://acme.test',
        start_date: '2024-01-01',
        end_date: null,
        description_de: 'Deutsch',
        description_en: 'English',
        status: 'active',
        status_color_token: 'green',
        translations: entry.translations,
      },
    ]);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.sortableEnabled).toBe(true);
  });

  it('filters by position or company and disables sorting while searching', async () => {
    stubFetch(() => jsonResponse([entry, { ...entry, id: 2, position: 'Architekt', company: 'Beta' }]));

    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    act(() => result.current.setSearch('beta'));

    expect(result.current.rows.map((row) => row.id)).toEqual([2]);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.sortableEnabled).toBe(false);
  });

  it('requires position and start date for a ghost row', async () => {
    stubFetch(() => jsonResponse([]));
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ position: '', start_date: '2024-01-01' }))
      .rejects.toThrow('Position ist ein Pflichtfeld.');
    await expect(result.current.onGhostCreate({ position: 'Dev', start_date: '' }))
      .rejects.toThrow('Start-Datum ist ein Pflichtfeld.');
  });

  it('creates a ghost row with trimmed values and reloads', async () => {
    let gets = 0;
    const fetchSpy = stubFetch((_url, init) => {
      if (init?.method === 'POST') return jsonResponse(entry);
      gets += 1;
      return jsonResponse([entry]);
    });
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({
        position: ' Dev ',
        start_date: '2024-01-01',
        company: ' ',
        description_de: ' Text ',
      });
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      position: 'Dev',
      company: null,
      project_url: null,
      start_date: '2024-01-01',
      end_date: null,
      translations: { de: { description: 'Text' } },
    });
    expect(gets).toBe(2);
  });

  it('keeps the other locale when saving a localized description', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(entry) : jsonResponse([entry])
    ));
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.onFieldSave(result.current.rows[0], 'description_de', 'Neu');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toContain(`${CAREER}/1`);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      translations: {
        de: { description: 'Neu' },
        en: { description: 'English' },
      },
    });
  });

  it('sends a null for an emptied optional field', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(entry) : jsonResponse([entry])
    ));
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.onFieldSave(result.current.rows[0], 'company', '');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ company: null });
  });

  it('reorders via ordered ids', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PATCH' ? jsonResponse([entry]) : jsonResponse([entry])
    ));
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.handleReorder([2, 1]);
    });

    const patch = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(String(patch?.[0])).toContain(`${CAREER}/reorder`);
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ ordered_ids: [2, 1] });
  });

  it('deletes an entry by id', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'DELETE' ? noContent() : jsonResponse([entry])
    ));
    const { result } = renderHook(() => useCareerEntryTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.handleDelete(result.current.rows[0]);
    });

    expect(fetchSpy.mock.calls.some(([url, init]) => init?.method === 'DELETE' && String(url).endsWith('/career/1')))
      .toBe(true);
  });
});
