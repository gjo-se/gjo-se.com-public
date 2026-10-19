import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

import { cn } from '@src/lib/utils';

import { collapsibleVariants } from './Collapsible.variants';

import type { CollapsibleProps } from './Collapsible.interface';

/**
 * Collapsible – Expandable content section with a trigger button.
 */
export default function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  children,
  ...domProps
}: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
      className={cn(collapsibleVariants())}
      {...domProps}
    >
      {children}
    </CollapsiblePrimitive.Root>
  );
}
