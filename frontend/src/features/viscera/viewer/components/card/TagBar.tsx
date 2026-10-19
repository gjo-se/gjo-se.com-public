import { useMemo } from 'react';

import type { EntityData } from '@src/features/viscera/core/useEntityCache';
import { COLOR_TOKEN_CSS, type ColorToken } from '@src/lib/colorTokens';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TagBarProps {
  /** Tag slugs from the workspace schema (e.g. ["backend", "critical"]). */
  tagSlugs: string[];
  /** Tag entity cache from `useEntityCache()`. Maps slug → EntityData. */
  tagMap: Map<string, EntityData>;
  /** Card width in pixels – the bar spans the card width minus horizontal padding. */
  cardWidth: number;
  /** Y position of the bar's top edge, relative to the card SVG group. */
  y: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BAR_HEIGHT = 4;
/** Horizontal padding to keep the segments clear of the card's outer borders. */
const PADDING_X = 6;
const FALLBACK_HEX = '#6B6B63'; // gray (COLOR_TOKEN_CSS.gray.hex)

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Horizontal tag-color strip at the bottom of architecture cards.
 *
 * Simple colored line segments (no text, no icons): each tag gets an equal-width
 * segment (1 tag = full width, 2 tags = 50% each, …), spanning the card width
 * minus a small horizontal padding so segments stay clear of the outer borders.
 * Colors are resolved from the tag's `colorToken` via `COLOR_TOKEN_CSS` (S1 palette).
 *
 * Renders nothing when `tagSlugs` is empty.
 */
export default function TagBar({ tagSlugs, tagMap, cardWidth, y }: TagBarProps) {
  const totalWidth = Math.max(cardWidth - PADDING_X * 2, 0);
  const segmentWidth = useMemo(
    () => (tagSlugs.length > 0 ? totalWidth / tagSlugs.length : 0),
    [tagSlugs.length, totalWidth],
  );

  if (tagSlugs.length === 0 || segmentWidth <= 0) return null;

  return (
    <g transform={`translate(${PADDING_X}, ${y})`}>
      {tagSlugs.map((slug, i) => {
        const entity = tagMap.get(slug);
        const css = entity?.colorToken
          ? COLOR_TOKEN_CSS[entity.colorToken as ColorToken] ?? COLOR_TOKEN_CSS.gray
          : COLOR_TOKEN_CSS.gray;
        const fill = css.hex || FALLBACK_HEX;

        return (
          <rect
            key={slug}
            x={i * segmentWidth}
            y={0}
            width={i === tagSlugs.length - 1
              ? totalWidth - i * segmentWidth
              : segmentWidth}
            height={BAR_HEIGHT}
            fill={fill}
          />
        );
      })}
    </g>
  );
}
