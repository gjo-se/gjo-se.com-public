import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

import type { HoverCardTriggerProps } from './HoverCardTrigger.interface';

/**
 * HoverCardTrigger – Anchor element that opens the hover card.
 */
export default function HoverCardTrigger({
  children,
  ...domProps
}: HoverCardTriggerProps) {
  return (
    <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...domProps}>
      {children}
    </PreviewCardPrimitive.Trigger>
  );
}
