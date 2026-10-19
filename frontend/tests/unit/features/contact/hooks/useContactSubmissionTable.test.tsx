/**
 * Tests: useContactSubmissionTable
 *
 * Verifies the list load, the invalidating delete (success returns null) and
 * the German error message when deleting fails.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useContactSubmissionTable } from '@src/features/contact/hooks/useContactSubmissionTable';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/wrappers';

const LIST_URL = '/admin/contact';

const submission = { id: 1, name: 'Ada', email: 'ada@example.test', message: 'Hallo' };

beforeEach(() => {
  httpBoundary.reset();
});

describe('useContactSubmissionTable', () => {
  it('loads the submissions', async () => {
    httpBoundary.on('get', LIST_URL, () => [submission]);

    const { result } = renderHook(() => useContactSubmissionTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.submissions).toEqual([submission]);
    expect(result.current.error).toBeNull();
  });

  it('deletes a submission, returns null and invalidates the list', async () => {
    httpBoundary.on('get', LIST_URL, () => [submission]);
    httpBoundary.on('delete', `${LIST_URL}/1`, () => undefined);
    const { result } = renderHook(() => useContactSubmissionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: string | null = 'unset';
    await act(async () => {
      outcome = await result.current.handleDelete(1);
    });

    expect(outcome).toBeNull();
    await waitFor(() =>
      expect(httpBoundary.calls.filter((call) => call.url === LIST_URL).length).toBeGreaterThan(1),
    );
  });

  it('returns the error message when deleting fails', async () => {
    httpBoundary.on('get', LIST_URL, () => [submission]);
    httpBoundary.on('delete', `${LIST_URL}/1`, () => {
      throw new Error('409 in use');
    });
    const { result } = renderHook(() => useContactSubmissionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.handleDelete(1)).resolves.toBe('409 in use');
  });

  it('reports a load error', async () => {
    httpBoundary.on('get', LIST_URL, () => {
      throw new Error('offline');
    });

    const { result } = renderHook(() => useContactSubmissionTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.submissions).toEqual([]);
  });
});
