/**
 * BoardCard.logic – Status-to-Chip-variant mapping for dedup board cards.
 *
 * DB status names are the SSOT: pending / active / inactive / rejected / deprecated.
 */

import type { ChipVariants } from '@src/components/primitives/Chip/Chip.variants';

/** Maps a skill status (DB name) to its colored Chip variant. */
export function statusChipVariant(status: string): NonNullable<ChipVariants['variant']> {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
    case 'deprecated':
      return 'muted';
    case 'rejected':
      return 'error';
    default:
      return 'info';
  }
}
