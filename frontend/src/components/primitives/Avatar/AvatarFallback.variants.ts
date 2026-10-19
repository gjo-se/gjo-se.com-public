import { cva, type VariantProps } from 'class-variance-authority';
export const avatarFallbackVariants = cva('flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs', { variants: {}, defaultVariants: {} });
export type AvatarFallbackVariants = VariantProps<typeof avatarFallbackVariants>;
