import type { ColorToken } from '@src/lib/colorTokens';

export interface TagColorPaletteProps {
  /** Currently selected ColorToken (or undefined if none). */
  value?: ColorToken;
  /** Called when the user selects a color. */
  onSelect: (token: ColorToken) => void;
  /** When true, all swatches are non-interactive. */
  disabled?: boolean;
}
