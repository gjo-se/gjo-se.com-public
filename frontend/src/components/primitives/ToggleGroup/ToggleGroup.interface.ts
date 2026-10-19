import type { ToggleGroupVariants } from './ToggleGroup.variants';
export interface ToggleGroupProps extends ToggleGroupVariants {
  variant?: string;
  size?: string;
  spacing?: number;
  orientation?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
  [key: string]: unknown;
}
