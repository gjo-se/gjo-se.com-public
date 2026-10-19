import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@src/lib/utils';

import { scrollAreaVariants } from './ScrollArea.variants';
import ScrollBar from './ScrollBar';

import type { ScrollAreaProps } from './ScrollArea.interface';

/** ScrollArea – Scrollable container with custom scrollbar. */
export default function ScrollArea({ children, ...domProps }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn(scrollAreaVariants())} {...domProps}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="size-full rounded-inherit transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}
