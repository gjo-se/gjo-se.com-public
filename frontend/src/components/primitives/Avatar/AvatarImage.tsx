import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '@src/lib/utils';

import { avatarImageVariants } from './AvatarImage.variants';

import type { AvatarImageProps } from './AvatarImage.interface';

/** AvatarImage – The user image displayed inside an Avatar. */
export default function AvatarImage({ ...domProps }: AvatarImageProps) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn(avatarImageVariants())} {...domProps} />;
}
