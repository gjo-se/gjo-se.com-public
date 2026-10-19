import type { SpinnerVariants } from './Spinner.variants';

export interface SpinnerProps extends Omit<SpinnerVariants, 'className' | 'style'> {
  fullWidth?: boolean;
  children?: React.ReactNode;
}
