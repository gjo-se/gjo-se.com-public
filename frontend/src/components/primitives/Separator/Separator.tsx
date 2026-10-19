import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '@src/lib/utils';

import { separatorVariants } from './Separator.variants';

import type { SeparatorProps } from './Separator.interface';

/**
 * Separator – Horizontal or vertical visual divider.
 */
export default function Separator({
  orientation = 'horizontal',
  spacing = 'none',
  ...domProps
}: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation as 'horizontal' | 'vertical'}
      className={cn(separatorVariants({ orientation, spacing }))}
      {...domProps}
    />
  );
}
