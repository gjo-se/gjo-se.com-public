import type { MenubarLabelVariants } from './MenubarLabel.variants';

export interface MenubarLabelProps extends MenubarLabelVariants {
  children?: React.ReactNode;
  inset?: boolean;
  [key: string]: unknown;
}
