import { cn } from '@src/lib/utils';

import { alertVariants } from './Alert.variants';

import type { AlertProps } from './Alert.interface';

/**
 * Alert – Status message with variant styling.
 */
export default function Alert({
  variant = 'default',
  ...domProps
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }))}
      {...domProps}
    />
  );
}
