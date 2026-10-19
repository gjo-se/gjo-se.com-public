import { cva, type VariantProps } from 'class-variance-authority';
export const avatarGroupVariants = cva('group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background', { variants: {}, defaultVariants: {} });
export type AvatarGroupVariants = VariantProps<typeof avatarGroupVariants>;
