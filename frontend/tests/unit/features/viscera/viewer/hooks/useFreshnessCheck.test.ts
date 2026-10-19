/**
 * Tests: useFreshnessCheck
 *
 * Verifies the initial loading state and the deterministic fallback when the
 * mtimes endpoint is unreachable (no outdated flag, zero timestamps, error).
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFreshnessCheck } from '@src/features/viscera/viewer/hooks/useFreshnessCheck';

describe('useFreshnessCheck', () => {
  it('starts in the loading state', () => {
    const { result } = renderHook(() => useFreshnessCheck('backend', 'backend-container'));

    expect(result.current.loading).toBe(true);
    expect(result.current.isOutdated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('falls back to a non-outdated result when the request fails', async () => {
    const { result } = renderHook(() => useFreshnessCheck('backend', 'backend-container'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isOutdated).toBe(false);
    expect(result.current.sourceMtime).toBe(0);
    expect(result.current.svgMtime).toBe(0);
    expect(result.current.error).toEqual(expect.any(String));
  });
});
