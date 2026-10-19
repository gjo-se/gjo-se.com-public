import { useMemo } from 'react';

import { useDarkMode } from '@src/hooks/useDarkMode';

import { technologyIconUrl } from '../../utils/technologyIconUrl';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TechIconBadgeProps {
  /** Technology slug of the card (from `technologies[]` in the object YAML). */
  technologySlug: string | undefined;
  /** X position (top-left) of the icon inside the card SVG. */
  x?: number;
  /** Y position (top-left) of the icon inside the card SVG. */
  y?: number;
  /** Icon-Kantenlänge (Quadrat) in Pixeln. */
  size?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Technology-Icon-Badge (SVG) auf einer Card.
 *
 * Die Icon-URL wird deterministisch aus dem Technology-Slug (YML-Zuweisung) und dem
 * globalen dark/light-Mode konstruiert. Liegt kein Slug vor, wird NICHTS gerendert;
 * hat die Technology ein Icon im ObjectStore, lädt das `<image>` die SVG-Datei.
 * Kein Buchstaben-Fallback.
 */
export default function TechIconBadge({ technologySlug, x = 8, y = 28, size = 18 }: TechIconBadgeProps) {
  const [isDark] = useDarkMode();
  const variant: 'dark' | 'light' = isDark ? 'dark' : 'light';

  const url = useMemo(
    () => (technologySlug ? technologyIconUrl(technologySlug, variant) : null),
    [technologySlug, variant],
  );

  if (!url) return null;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <image
        href={url}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{technologySlug}</title>
      </image>
    </g>
  );
}
