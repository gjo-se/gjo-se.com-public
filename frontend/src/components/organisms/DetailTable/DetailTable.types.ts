import type { ReactNode } from 'react';

export interface DetailRow {
  /** Label text (left column). */
  label: string;
  /** Display value (null → '–'). */
  value: string | null;
  /** Field key passed to onSave for identifying what was edited. */
  field: string;
  /** URL to render as an external link instead of plain text. */
  url?: string | null;
  /**
   * Optional custom value cell. When set, it replaces the click-to-edit
   * display (used e.g. for enum rows rendered as a dropdown).
   */
  renderValue?: () => ReactNode;
}
