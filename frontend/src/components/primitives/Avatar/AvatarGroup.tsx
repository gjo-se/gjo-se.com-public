import { cn } from '@src/lib/utils';

import { avatarGroupVariants } from './AvatarGroup.variants';

import type { AvatarGroupProps } from './AvatarGroup.interface';

/** AvatarGroup – Horizontally overlapping avatar cluster. */
export default function AvatarGroup({ children, ...domProps }: AvatarGroupProps) {
  return <div data-slot="avatar-group" className={cn(avatarGroupVariants())} {...domProps}>{children}</div>;
}
