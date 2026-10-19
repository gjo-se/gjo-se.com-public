import { cva, type VariantProps } from 'class-variance-authority';

/** Inline-Badge eines bestehenden Links (Text + ×-Unlink). */
export const entityLinkBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700',
);

export type EntityLinkComboboxVariants = VariantProps<typeof entityLinkBadgeVariants>;
