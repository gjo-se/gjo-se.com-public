import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { spinnerVariants } from './Spinner.variants';

import type { SpinnerProps } from './Spinner.interface';

/**
 * Spinner – Animated loading indicator with optional full-width layout.
 */
export default function Spinner({
  size = 'md',
  fullWidth = false,
  ...domProps
}: SpinnerProps) {
  const spinner = (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }))}
      {...domProps}
    >
      <Icon name="loader-2" aria-hidden />
    </span>
  );

  if (fullWidth) {
    return <div className="flex justify-center py-12">{spinner}</div>;
  }

  return spinner;
}
