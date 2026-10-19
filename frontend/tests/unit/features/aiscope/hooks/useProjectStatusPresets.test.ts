/**
 * Tests: useProjectStatusPresets
 *
 * Prüft die abgeleiteten Preset-Filter und die URL-Synchronisation.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectStatusPresets } from '@src/features/aiscope/hooks/useProjectStatusPresets';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('table-state:projects');
  window.history.replaceState(null, '', '/');
});

describe('useProjectStatusPresets – preset filters', () => {
  it('defaults to "open" with include_archived=false and no status', () => {
    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    expect(result.current.preset).toBe('open');
    expect(result.current.filter).toEqual({ include_archived: false });
    expect(result.current.filter.status).toBeUndefined();
  });

  it('derives the exact status for new, favorites and archived presets', () => {
    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    act(() => result.current.setPreset('new'));
    expect(result.current.filter.status).toBe('new');

    act(() => result.current.setPreset('favorites'));
    expect(result.current.filter.status).toBe('favorite');

    act(() => result.current.setPreset('archived'));
    expect(result.current.filter.status).toBe('archived');
  });

  it('resets back to the default preset', () => {
    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    act(() => result.current.setPreset('archived'));
    act(() => result.current.resetPreset());

    expect(result.current.preset).toBe('open');
  });
});

describe('useProjectStatusPresets – URL sync', () => {
  it('initialises the preset from the ?preset= query param', () => {
    window.history.replaceState(null, '', '/admin/aiscope/project?preset=favorites');

    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    expect(result.current.preset).toBe('favorites');
    expect(result.current.filter.status).toBe('favorite');
  });

  it('writes a non-default preset to the URL and drops it again on reset', () => {
    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    act(() => result.current.setPreset('archived'));
    expect(new URLSearchParams(window.location.search).get('preset')).toBe('archived');

    act(() => result.current.resetPreset());
    expect(new URLSearchParams(window.location.search).get('preset')).toBeNull();
  });

  it('ignores an unknown preset value in the URL and falls back to the default', () => {
    window.history.replaceState(null, '', '/admin/aiscope/project?preset=bogus');

    const { result } = renderHook(() => useProjectStatusPresets({ tableKey: 'projects' }));

    expect(result.current.preset).toBe('open');
  });
});
