import { cn } from '@src/lib/utils';

import { avatarGroupCountVariants } from './AvatarGroupCount.variants';

import type { AvatarGroupCountProps } from './AvatarGroupCount.interface';

/** AvatarGroupCount – "+N" overflow indicator for avatar groups. */
export default function AvatarGroupCount({ children, ...domProps }: AvatarGroupCountProps) {
  return <div data-slot="avatar-group-count" className={cn(avatarGroupCountVariants())} {...domProps}>{children}</div>;
}
