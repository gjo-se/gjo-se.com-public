import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '@src/lib/utils';

import { avatarFallbackVariants } from './AvatarFallback.variants';

import type { AvatarFallbackProps } from './AvatarFallback.interface';

/** AvatarFallback – Placeholder initials or icon shown when no image is loaded. */
export default function AvatarFallback({ children, ...domProps }: AvatarFallbackProps) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn(avatarFallbackVariants())} {...domProps}>{children}</AvatarPrimitive.Fallback>;
}
