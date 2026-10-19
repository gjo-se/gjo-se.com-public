import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

import { cn } from '@src/lib/utils';

import { collapsibleTriggerVariants } from './CollapsibleTrigger.variants';

import type { CollapsibleTriggerProps } from './CollapsibleTrigger.interface';

/** CollapsibleTrigger – Button that toggles the collapsible content. */
export default function CollapsibleTrigger({ children, ...domProps }: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(collapsibleTriggerVariants())}
      {...domProps}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}
