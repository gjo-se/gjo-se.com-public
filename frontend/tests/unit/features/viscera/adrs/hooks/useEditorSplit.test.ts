/**
 * Tests: useEditorSplit
 *
 * Verifies the store-backed split ratio conversion (fraction 0–1 ↔ percentage
 * 0–100) for both scopes plus the store's clamping boundaries, without
 * touching localStorage.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useEditorSplit } from '@src/features/viscera/adrs/hooks/useEditorSplit';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

beforeEach(() => {
  resetVisceraStore();
});

describe('useEditorSplit', () => {
  it('exposes the adr split ratio as a percentage', () => {
    const { result } = renderHook(() => useEditorSplit('adr'));

    expect(result.current.ratio).toBe(50);
  });

  it('converts a percentage write into a store fraction', () => {
    const { result } = renderHook(() => useEditorSplit('yaml'));

    act(() => result.current.setRatio(25));

    expect(result.current.ratio).toBe(25);
    expect(useVisceraStore.getState().splitRatioYaml).toBe(0.25);
    expect(useVisceraStore.getState().splitRatioAdr).toBe(0.5);
  });

  it('clamps ratios below the minimum to twenty percent', () => {
    const { result } = renderHook(() => useEditorSplit('adr'));

    act(() => result.current.setRatio(5));

    expect(result.current.ratio).toBe(20);
  });

  it('clamps ratios above the maximum to eighty percent', () => {
    const { result } = renderHook(() => useEditorSplit('adr'));

    act(() => result.current.setRatio(95));

    expect(result.current.ratio).toBe(80);
  });
});
