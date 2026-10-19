import type { ColorToken } from '@src/lib/colorTokens';

export interface StatusBadgeProps {
  /** Status name (e.g. "pending", "approved", "rejected"). */
  statusName: string;
  /** ColorToken from the central color palette. */
  colorToken: ColorToken;
  /** Optional category for tooltip display (e.g. "lifecycle", "triage"). */
  category?: string;
  /** Visual variant: "dot" for table cells, "badge" for detail views. */
  variant?: 'dot' | 'badge';
  /** Size: "sm" for compact, "md" (default) for standard. */
  size?: 'sm' | 'md';
}
