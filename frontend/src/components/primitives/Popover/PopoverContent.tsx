import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@src/lib/utils';

import { popoverContentVariants } from './PopoverContent.variants';

import type { PopoverContentProps } from './PopoverContent.interface';

/** PopoverContent – The floating panel with portal, positioning, and animations. */
export default function PopoverContent({
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  children,
  ...domProps
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(popoverContentVariants())}
          {...domProps}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
