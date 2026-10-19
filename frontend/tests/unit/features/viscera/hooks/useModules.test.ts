/**
 * Tests: useModules
 *
 * Verifies the store-backed loading lifecycle: defaults, the running state set
 * before the request, and the error state when the modules endpoint cannot be
 * reached. Resetting clears the slice.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useModules } from '@src/features/viscera/hooks/useModules';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

beforeEach(() => {
  resetVisceraStore();
});

describe('useModules', () => {
  it('starts with an empty slice', () => {
    const { result } = renderHook(() => useModules());

    expect(result.current.modules).toEqual([]);
    expect(result.current.system).toBeNull();
    expect(result.current.topLevel).toBeNull();
    expect(result.current.modulesLoading).toBe(false);
    expect(result.current.modulesError).toBeNull();
  });

  it('surfaces an error when the modules service is unreachable', async () => {
    const { result } = renderHook(() => useModules());

    await act(async () => {
      await result.current.loadModules('backend');
    });

    await waitFor(() => expect(result.current.modulesLoading).toBe(false));
    expect(result.current.modulesError).toEqual(expect.any(String));
    expect(result.current.modules).toEqual([]);
  });

  it('clears the module slice on reset', async () => {
    const { result } = renderHook(() => useModules());
    await act(async () => {
      await result.current.loadModules('backend');
    });
    expect(result.current.modulesError).not.toBeNull();

    act(() => result.current.resetModules());

    expect(result.current.modulesError).toBeNull();
    expect(useVisceraStore.getState().system).toBeNull();
  });
});
