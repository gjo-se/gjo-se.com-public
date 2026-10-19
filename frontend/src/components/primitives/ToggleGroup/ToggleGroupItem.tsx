import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';

import { toggleVariants } from '@src/components/primitives/Toggle/Toggle.variants';
import { cn } from '@src/lib/utils';

import { toggleGroupItemVariants } from './ToggleGroupItem.variants';
import { useToggleGroup } from './useToggleGroup';

import type { ToggleGroupItemProps } from './ToggleGroupItem.interface';

/** ToggleGroupItem – Single toggle button inside a ToggleGroup. Inherits variant from context. */
export default function ToggleGroupItem({
  variant = 'default', size = 'default', children, ...domProps
}: ToggleGroupItemProps) {
  const context = useToggleGroup();
  const v = (context.variant || variant) as 'default' | 'outline';
  const s = (context.size || size) as 'default' | 'sm' | 'lg';
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={s}
      className={cn(toggleGroupItemVariants(), toggleVariants({ variant: v, size: s }))}
      {...domProps}
    >
      {children}
    </TogglePrimitive>
  );
}
