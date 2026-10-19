/**
 * Tests: useContactToken
 *
 * Covers the mount load, the error flag and the reload retry path.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useContactToken } from '@src/features/contact/hooks/useContactToken';

import { httpBoundary } from '../../helpers/httpBoundary';

const TOKEN_URL = '/public/contact/token';

beforeEach(() => {
  httpBoundary.reset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('useContactToken', () => {
  it('loads the signed token on mount', async () => {
    httpBoundary.on('get', TOKEN_URL, () => ({ token: 'sig' }));

    const { result } = renderHook(() => useContactToken());

    await waitFor(() => expect(result.current.token).toBe('sig'));
    expect(result.current.error).toBe(false);
  });

  it('flags an error and leaves the token empty when the request fails', async () => {
    httpBoundary.on('get', TOKEN_URL, () => {
      throw new Error('offline');
    });

    const { result } = renderHook(() => useContactToken());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.token).toBeNull();
  });

  it('fetches a fresh token on reload', async () => {
    let n = 0;
    httpBoundary.on('get', TOKEN_URL, () => ({ token: `sig-${++n}` }));
    const { result } = renderHook(() => useContactToken());
    await waitFor(() => expect(result.current.token).toBe('sig-1'));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.token).toBe('sig-2'));
  });
});
