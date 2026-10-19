import type { ColorToken } from '@src/lib/colorTokens';

export interface TagBadgeProps {
  /** Tag name, e.g. "High", "Public cloud". */
  name: string;
  /** Colour token driving background, text, border and dot colours. */
  colorToken: ColorToken;
  /** Category shown only in the hover tooltip, e.g. "Risk". */
  category?: string;
  /** Visual variant: inline dot for tables or full chip badge for detail views. */
  variant?: 'dot' | 'chip';
  /** Called when the user clicks the remove (×) button. Only rendered for chip variant. */
  onRemove?: () => void;
  /** Controls padding and font size. */
  size?: 'sm' | 'md';
}
