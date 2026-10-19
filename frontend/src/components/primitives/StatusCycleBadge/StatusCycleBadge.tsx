import { COLOR_TOKEN_CSS } from '@src/lib/colorTokens';

import type { StatusCycleBadgeProps } from './StatusCycleBadge.interface';

/**
 * StatusCycleBadge – Clickable status indicator that cycles through states.
 *
 * Click advances to the next status in the defined cycle.
 * Renders only a colored dot; status name shown as tooltip on hover.
 */
export default function StatusCycleBadge({
  currentName,
  currentColor,
  nextName,
  onCycle,
  disabled = false,
}: StatusCycleBadgeProps) {
  const colors = COLOR_TOKEN_CSS[currentColor];
  const hasNext = nextName !== null && !disabled;
  const tooltip = hasNext ? `${currentName} → ${nextName}` : currentName;

  return (
    <button
      type="button"
      className={`inline-flex items-center rounded px-1 py-0.5 -mx-1 transition-colors ${
        hasNext
          ? 'cursor-pointer hover:bg-on-surface/8 active:bg-on-surface/12'
          : 'cursor-default'
      }`}
      title={tooltip}
      onClick={() => { if (hasNext) onCycle(); }}
      disabled={!hasNext}
    >
      <div className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
    </button>
  );
}
