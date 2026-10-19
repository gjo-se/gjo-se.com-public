import type { ChipVariants } from './Chip.variants';

export interface ChipProps extends Omit<ChipVariants, 'className' | 'style'> {
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}
