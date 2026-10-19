import type { ColorToken } from '@src/lib/colorTokens';

export interface StatusCycleBadgeProps {
  /** Current status name (e.g. "pending", "active"). */
  currentName: string;
  /** Current status color token from the central palette. */
  currentColor: ColorToken;
  /** Next status name in the cycle, or null if at cycle end. Shown as tooltip. */
  nextName: string | null;
  /** Called when the badge is clicked and a next status exists. */
  onCycle: () => void;
  /** Disables the click interaction. */
  disabled?: boolean;
}
