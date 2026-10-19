import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@src/lib/utils';

import { scrollBarVariants } from './ScrollBar.variants';

import type { ScrollBarProps } from './ScrollBar.interface';

/** ScrollBar – Custom scrollbar with thumb indicator. */
export default function ScrollBar({ orientation = 'vertical', ...domProps }: ScrollBarProps) {
  return (
    <ScrollAreaPrimitive.Scrollbar data-slot="scroll-area-scrollbar" data-orientation={orientation} orientation={orientation} className={cn(scrollBarVariants())} {...domProps}>
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
