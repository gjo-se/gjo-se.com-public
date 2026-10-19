import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import Image from '@src/components/primitives/Image';
import Text from '@src/components/primitives/Text';
import { cn } from '@src/lib/utils';

import { avatarVariants } from './Avatar.variants';

import type { AvatarProps } from './Avatar.interface';

/**
 * Avatar – Circular profile image with initials fallback and optional name line.
 */
export default function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  name,
  role,
  ...domProps
}: AvatarProps) {
  const circle = (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), 'inline-flex items-center justify-center overflow-hidden')}
      aria-label={alt}
      {...domProps}
    >
      {src ? (
        <Image src={src} alt={alt} fit="cover" />
      ) : (
        <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-surface-container-hover font-semibold text-on-surface-muted">
          {initials ?? alt.slice(0, 2).toUpperCase()}
        </AvatarPrimitive.Fallback>
      )}
    </AvatarPrimitive.Root>
  );

  if (!name) return circle;

  return (
    <div className="flex items-center gap-3">
      {circle}
      <div className="flex flex-col">
        <Text variant="label" weight="semibold">{name}</Text>
        {role && <Text variant="caption" color="muted">{role}</Text>}
      </div>
    </div>
  );
}
