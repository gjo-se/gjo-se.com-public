import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

import { cn } from '@src/lib/utils';

import { hoverCardContentVariants } from './HoverCardContent.variants';

import type { HoverCardContentProps } from './HoverCardContent.interface';

/**
 * HoverCardContent – Popup content for the hover card.
 */
export default function HoverCardContent({
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 4,
  children,
  ...domProps
}: HoverCardContentProps) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(hoverCardContentVariants())}
          {...domProps}
        >
          {children}
        </PreviewCardPrimitive.Popup>
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}
