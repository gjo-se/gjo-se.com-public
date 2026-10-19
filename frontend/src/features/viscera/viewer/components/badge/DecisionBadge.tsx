import type { Adr } from '@src/features/viscera/adrs/hooks/useAdrs';

import type { MouseEvent } from 'react';


const MAX_TOOLTIP_ITEMS = 5;
const BADGE_X_OFFSET = 46;
const BADGE_Y = 8;
const ICON_SIZE = 16;

export interface DecisionBadgeProps {
  decisions: Adr[];
  systemId: string;
  cardWidth: number;
}

/** Renders a 💡 icon in the top-right corner of a card when ADRs reference this system.
 *  Hover shows a tooltip listing ADR titles; click navigates to the ADR table filtered by system. */
export default function DecisionBadge({ decisions, systemId, cardWidth }: DecisionBadgeProps) {
  if (decisions.length === 0) return null;

  const count = decisions.length;
  const label = count === 1 ? 'Architecture Decision' : 'Architecture Decisions';

  const lines: string[] = [];
  lines.push(`💡 ${count} ${label}:`);
  lines.push('');

  const shown = decisions.slice(0, MAX_TOOLTIP_ITEMS);
  shown.forEach((adr) => {
    lines.push(`${adr.idString} – ${adr.title}`);
  });

  if (count > MAX_TOOLTIP_ITEMS) {
    lines.push(`… und ${count - MAX_TOOLTIP_ITEMS} weitere`);
  }

  const tooltip = lines.join('\n');

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/admin/viscera/adrs?systems=${encodeURIComponent(systemId)}`;
  };

  return (
    <g
      transform={`translate(${cardWidth - BADGE_X_OFFSET}, ${BADGE_Y})`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <title>{tooltip}</title>
      <text fontSize={ICON_SIZE} textAnchor="middle" opacity={0.9}>
        {'\u{1F4A1}'}
      </text>
    </g>
  );
}
