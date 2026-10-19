import { cva, type VariantProps } from 'class-variance-authority';
export const commandGroupVariants = cva('overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground', { variants: {}, defaultVariants: {} });
export type CommandGroupVariants = VariantProps<typeof commandGroupVariants>;
