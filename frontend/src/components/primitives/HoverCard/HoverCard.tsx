import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

import type { HoverCardProps } from './HoverCard.interface';

/**
 * HoverCard – Root for a preview card that appears on hover. Wraps Base UI PreviewCard.
 */
export default function HoverCard({ children, ...domProps }: HoverCardProps) {
  return (
    <PreviewCardPrimitive.Root data-slot="hover-card" {...domProps}>
      {children}
    </PreviewCardPrimitive.Root>
  );
}
