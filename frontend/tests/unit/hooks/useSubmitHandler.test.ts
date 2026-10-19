/**
 * Tests: useSubmitHandler – validates, tracks loading/error and normalises
 * failure messages (API detail, custom fallback, unknown fallback).
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSubmitHandler } from '@src/hooks/useSubmitHandler';

function axiosError(detail?: string): unknown {
  return { isAxiosError: true, response: detail ? { data: { detail } } : undefined };
}

describe('useSubmitHandler', () => {
  it('starts in an idle state', () => {
    const { result } = renderHook(() => useSubmitHandler());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not run the submit when validation fails', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const { result } = renderHook(() =>
      useSubmitHandler({ validate: () => 'Pflichtfeld fehlt' }),
    );

    let returned: string | undefined;
    await act(async () => {
      returned = await result.current.handleSubmit(fn);
    });

    expect(returned).toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Pflichtfeld fehlt');
    expect(result.current.loading).toBe(false);
  });

  it('returns the result and calls onSuccess on success', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSubmitHandler({ onSuccess }));

    let returned: string | undefined;
    await act(async () => {
      returned = await result.current.handleSubmit(() => Promise.resolve('saved'));
    });

    expect(returned).toBe('saved');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('uses the API error detail for axios failures', async () => {
    const { result } = renderHook(() => useSubmitHandler({ errorMessage: 'Fallback' }));

    await act(async () => {
      await result.current.handleSubmit(() => Promise.reject(axiosError('Conflict')));
    });

    expect(result.current.error).toBe('Conflict');
    expect(result.current.loading).toBe(false);
  });

  it('uses the custom fallback when the axios error has no detail', async () => {
    const { result } = renderHook(() => useSubmitHandler({ errorMessage: 'Eigener Fehler' }));

    await act(async () => {
      await result.current.handleSubmit(() => Promise.reject(axiosError()));
    });

    expect(result.current.error).toBe('Eigener Fehler');
  });

  it('uses the generic axios fallback without a custom message', async () => {
    const { result } = renderHook(() => useSubmitHandler());

    await act(async () => {
      await result.current.handleSubmit(() => Promise.reject(axiosError()));
    });

    expect(result.current.error).toBe('Ein Fehler ist aufgetreten.');
  });

  it('reports an unknown failure for non-axios errors', async () => {
    const { result } = renderHook(() => useSubmitHandler());

    await act(async () => {
      await result.current.handleSubmit(() => Promise.reject(new Error('boom')));
    });

    expect(result.current.error).toBe('Ein unbekannter Fehler ist aufgetreten.');
  });

  it('clears a previous error', async () => {
    const { result } = renderHook(() => useSubmitHandler());
    await act(async () => {
      await result.current.handleSubmit(() => Promise.reject(new Error('boom')));
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
