import { Dialog } from '@base-ui/react/dialog';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import type { SheetContentProps } from './SheetContent.interface';

/**
 * SheetContent – Slide-in panel content with overlay.
 */
export default function SheetContent({
  children,
  side = 'right',
  showCloseButton = true,
  ...domProps
}: SheetContentProps) {
  return (
    <Dialog.Portal data-slot="sheet-portal">
      <Dialog.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
      />
      <Dialog.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out',
          'data-ending-style:opacity-0 data-starting-style:opacity-0',
          'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10',
          'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:-translate-x-10 data-[side=left]:data-starting-style:-translate-x-10',
          'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10',
          'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10',
          'data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
        )}
        {...domProps}
      >
        {children}
        {Boolean(showCloseButton) && (
          <Dialog.Close
            data-slot="sheet-close"
            className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon name="x" aria-hidden />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        )}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
