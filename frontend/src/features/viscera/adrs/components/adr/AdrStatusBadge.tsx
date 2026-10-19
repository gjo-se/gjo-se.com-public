/**
 * AdrStatusBadge – Status-Badge für Architecture Decision Records.
 *
 * Status-Farben (via Chip-Variante):
 *   Proposed   = info (blau)
 *   Accepted   = success (gruen)
 *   Deprecated = warning (orange)
 *   Superseded = error (rot)
 *   Draft      = muted (grau)
 */

import Chip from '@src/components/primitives/Chip/Chip';

/** Lokal definiert zur Vermeidung von Feature-Boundary-Verletzung. */
type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'draft';

const STATUS_VARIANT: Record<AdrStatus, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  proposed: 'info',
  accepted: 'success',
  deprecated: 'warning',
  superseded: 'error',
  draft: 'muted',
};

const STATUS_LABEL: Record<AdrStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  deprecated: 'Deprecated',
  superseded: 'Superseded',
  draft: 'Draft',
};

/** Status-Badge mit farbcodierter Chip-Variante. */
export default function AdrStatusBadge({ status }: { status: AdrStatus }) {
  return (
    <Chip variant={STATUS_VARIANT[status]} size="sm">
      {STATUS_LABEL[status]}
    </Chip>
  );
}
