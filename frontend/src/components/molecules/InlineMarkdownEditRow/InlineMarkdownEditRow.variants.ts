import { cva, type VariantProps } from 'class-variance-authority';

/** Klickbare Markdown-Vorschau-Zelle (DetailTable-Editierstil). */
export const inlineMarkdownDisplayVariants = cva(
  'w-full cursor-pointer rounded px-1 -mx-1 py-0.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-7 text-on-surface-secondary',
);

export type InlineMarkdownEditRowVariants = VariantProps<typeof inlineMarkdownDisplayVariants>;
