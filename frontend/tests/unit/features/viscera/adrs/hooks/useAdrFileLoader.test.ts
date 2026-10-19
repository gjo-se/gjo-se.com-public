/**
 * Tests: useAdrFileLoader
 *
 * Verifies the flat return object at the public interface: no path means no
 * load, an unreachable path surfaces an error instead of a silent empty body,
 * and a path change resets the previous error before the next load settles.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAdrFileLoader } from '@src/features/viscera/adrs/hooks/useAdrFileLoader';

describe('useAdrFileLoader', () => {
  it('skips loading when no file path is given', () => {
    const { result } = renderHook(() => useAdrFileLoader());

    expect(result.current.loading).toBe(false);
    expect(result.current.rawText).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('reports an error when the file cannot be fetched', async () => {
    const { result } = renderHook(() => useAdrFileLoader('/architecture/adr/0001-missing.md'));

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(expect.any(String));
    expect(result.current.error).not.toBe('');
    expect(result.current.rawText).toBe('');
  });

  it('clears the previous error when the file path changes', async () => {
    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useAdrFileLoader(path),
      { initialProps: { path: '/architecture/adr/0001-first.md' } },
    );
    await waitFor(() => expect(result.current.error).toEqual(expect.any(String)));

    rerender({ path: '/architecture/adr/0002-second.md' });

    expect(result.current.error).toBeNull();
    expect(result.current.rawText).toBe('');
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
