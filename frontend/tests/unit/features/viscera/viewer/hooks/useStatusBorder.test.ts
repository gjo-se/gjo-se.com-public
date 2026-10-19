/**
 * Tests: useStatusBorder
 *
 * Verifies the status color resolution: unknown/missing slugs fall back to the
 * neutral CSS stroke, known slugs resolve their token hex for stroke and tint,
 * and an unknown color token falls back to gray.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { COLOR_TOKEN_CSS } from '@src/lib/colorTokens';
import { useStatusBorder } from '@src/features/viscera/viewer/hooks/useStatusBorder';

import type { EntityData } from '@src/features/viscera/core/useEntityCache';

function makeStatusMap(entries: EntityData[]): Map<string, EntityData> {
  return new Map(entries.map((entry) => [entry.slug, entry]));
}

describe('useStatusBorder', () => {
  it('returns null without a status slug', () => {
    const { result } = renderHook(() =>
      useStatusBorder(undefined, makeStatusMap([
        { slug: 'viscera-approved', name: 'Approved', colorToken: 'green' },
      ])),
    );

    expect(result.current).toBeNull();
  });

  it('returns null while the status cache is empty', () => {
    const { result } = renderHook(() => useStatusBorder('viscera-approved', new Map()));

    expect(result.current).toBeNull();
  });

  it('returns null for an unknown status slug', () => {
    const { result } = renderHook(() =>
      useStatusBorder('viscera-unknown', makeStatusMap([
        { slug: 'viscera-approved', name: 'Approved', colorToken: 'green' },
      ])),
    );

    expect(result.current).toBeNull();
  });

  it('resolves the token hex for a known status', () => {
    const { result } = renderHook(() =>
      useStatusBorder('viscera-pending', makeStatusMap([
        { slug: 'viscera-pending', name: 'Pending', colorToken: 'amber' },
      ])),
    );

    expect(result.current).toEqual({
      stroke: COLOR_TOKEN_CSS.amber.hex,
      background: COLOR_TOKEN_CSS.amber.hex,
      strokeWidth: 2,
    });
  });

  it('falls back to gray for an unknown color token', () => {
    const { result } = renderHook(() =>
      useStatusBorder('viscera-legacy', makeStatusMap([
        { slug: 'viscera-legacy', name: 'Legacy', colorToken: 'not-a-token' },
      ])),
    );

    expect(result.current?.stroke).toBe(COLOR_TOKEN_CSS.gray.hex);
  });
});
