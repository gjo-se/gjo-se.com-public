import { cn } from '@src/lib/utils';

import { buttonGroupVariants } from './ButtonGroup.variants';

import type { ButtonGroupProps } from './ButtonGroup.interface';

/**
 * ButtonGroup – Groups buttons with orientation support.
 */
export default function ButtonGroup({
  orientation = 'horizontal',
  ...domProps
}: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      className={cn(buttonGroupVariants({ orientation }))}
      {...domProps}
    />
  );
}
