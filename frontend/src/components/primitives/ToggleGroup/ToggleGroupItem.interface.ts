import type { ToggleGroupItemVariants } from './ToggleGroupItem.variants';
export interface ToggleGroupItemProps extends ToggleGroupItemVariants {
  variant?: string;
  size?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}
