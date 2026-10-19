/**
 * Pure helpers for the ProjectComparisonTable organism.
 */
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import { dataCol, stickyCanonical } from './ProjectComparisonTable.constants';

import type { CSSProperties } from 'react';

/** Returns the appropriate cell style for a given column. */
export function colStyle(_col: ComparisonColumn, index: number): CSSProperties {
  if (index === 0) return stickyCanonical;
  return dataCol;
}
