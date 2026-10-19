import { useMemo } from 'react';

import type { EntityData } from '@src/features/viscera/core/useEntityCache';
import { COLOR_TOKEN_CSS, type ColorToken } from '@src/lib/colorTokens';


// ── Types ──────────────────────────────────────────────────────────────────────

export interface StatusBorderResult {
  /** S1-Hex der Statusfarbe (identisch zur Button-Bar, z.B. #C97A4A). */
  stroke: string;
  /** S1-Hex als transluzenter Background-Tint (gleiche Basis wie Border). */
  background: string;
  strokeWidth: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Determines the SVG rect border attributes based on the object's status slug.
 *
 * - Returns `{ stroke, background, strokeWidth: 2 }` for every known status
 *   (inkl. Default `approved`) → die Karte trägt die S1-Statusfarbe
 *   (`COLOR_TOKEN_CSS`) in Background, Border und Schrift – identisch zur
 *   Status-Badge in der Button-Bar.
 * - Returns `null` for unknown / missing slugs → CSS-Klasse-Stroke (neutral).
 *
 * @param statusSlug - The status slug from workspace data (e.g. "viscera-approved").
 * @param statusMap  - The status entity cache from `useEntityCache()`.
 */
export function useStatusBorder(
  statusSlug: string | undefined,
  statusMap: Map<string, EntityData>,
): StatusBorderResult | null {
  return useMemo<StatusBorderResult | null>(() => {
    // No status or cache not loaded → fallback (CSS class stroke)
    if (!statusSlug || statusMap.size === 0) return null;

    const entity = statusMap.get(statusSlug);
    if (!entity) return null; // unknown slug → fallback

    const css = COLOR_TOKEN_CSS[entity.colorToken as ColorToken] ?? COLOR_TOKEN_CSS.gray;
    return {
      stroke: css.hex,
      background: css.hex,
      strokeWidth: 2,
    };
  }, [statusSlug, statusMap]);
}
