import { cn } from '@src/lib/utils';

import { avatarBadgeVariants } from './AvatarBadge.variants';

import type { AvatarBadgeProps } from './AvatarBadge.interface';

/** AvatarBadge – Status indicator dot on the bottom-right of an Avatar. */
export default function AvatarBadge({ children, ...domProps }: AvatarBadgeProps) {
  return <span data-slot="avatar-badge" className={cn(avatarBadgeVariants())} {...domProps}>{children}</span>;
}
