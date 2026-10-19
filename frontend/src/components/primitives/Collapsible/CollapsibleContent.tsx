import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

import { cn } from '@src/lib/utils';

import { collapsibleContentVariants } from './CollapsibleContent.variants';

import type { CollapsibleContentProps } from './CollapsibleContent.interface';

/** CollapsibleContent – Expandable content panel inside a Collapsible. */
export default function CollapsibleContent({ children, ...domProps }: CollapsibleContentProps) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(collapsibleContentVariants())}
      {...domProps}
    >
      {children}
    </CollapsiblePrimitive.Panel>
  );
}
