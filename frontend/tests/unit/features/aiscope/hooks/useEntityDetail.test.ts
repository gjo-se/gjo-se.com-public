/**
 * Tests: useEntityDetail
 *
 * Generischer Hook – getestet mit einem Mock-Setup.
 * Prüft loading, success, error und empty-id Zustände.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FieldEntry } from '@src/features/aiscope/core/types';

import { useEntityDetail, type UseEntityDetailConfig } from '@src/features/aiscope/hooks/useEntityDetail';

// ── Test types ─────────────────────────────────────────────────────

interface TestEntity {
  id: number;
  name: string;
}

// ── Test helpers ───────────────────────────────────────────────────

function buildTestFields(entity: TestEntity): FieldEntry[] {
  return [
    { kind: 'text', label: 'ID', value: String(entity.id) },
    { kind: 'text', label: 'Name', value: entity.name },
  ];
}

function createConfig(
  overrides: Partial<UseEntityDetailConfig<TestEntity>> = {},
): UseEntityDetailConfig<TestEntity> {
  return {
    id: '42',
    fetchFn: vi.fn(),
    buildFields: buildTestFields,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────

describe('useEntityDetail', () => {
  it('returns loading=true and null entity on initial render', () => {
    const config = createConfig({
      fetchFn: vi.fn(() => new Promise<TestEntity>(() => {})), // never resolves
    });

    const { result } = renderHook(() => useEntityDetail(config));

    expect(result.current.loading).toBe(true);
    expect(result.current.entity).toBeNull();
    expect(result.current.fields).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns entity and fields after successful fetch', async () => {
    const mockEntity: TestEntity = { id: 42, name: 'Test Entity' };
    const fetchFn = vi.fn().mockResolvedValue(mockEntity);
    const config = createConfig({ fetchFn });

    const { result } = renderHook(() => useEntityDetail(config));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entity).toEqual(mockEntity);
    expect(result.current.error).toBeNull();
    expect(result.current.fields).toEqual([
      { kind: 'text', label: 'ID', value: '42' },
      { kind: 'text', label: 'Name', value: 'Test Entity' },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(42);
  });

  it('returns error message when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const config = createConfig({ fetchFn });

    const { result } = renderHook(() => useEntityDetail(config));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Nicht gefunden.');
    expect(result.current.entity).toBeNull();
    expect(result.current.fields).toEqual([]);
  });

  it('uses custom errorMessage when provided', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Not found'));
    const config = createConfig({
      fetchFn,
      errorMessage: 'Eigenes Error-Message',
    });

    const { result } = renderHook(() => useEntityDetail(config));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Eigenes Error-Message');
  });

  it('does not fetch when id is undefined', async () => {
    const fetchFn = vi.fn();
    const config = createConfig({ id: undefined, fetchFn });

    const { result } = renderHook(() => useEntityDetail(config));

    // loading bleibt true, da kein Fetch ausgelöst wird
    expect(result.current.loading).toBe(true);
    expect(result.current.entity).toBeNull();
    expect(result.current.fields).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('converts string id to number for fetchFn', async () => {
    const mockEntity: TestEntity = { id: 7, name: 'Seven' };
    const fetchFn = vi.fn().mockResolvedValue(mockEntity);
    const config = createConfig({ id: '7', fetchFn });

    const { result } = renderHook(() => useEntityDetail(config));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledWith(7);
    expect(result.current.entity?.id).toBe(7);
  });
});
