import { cva, type VariantProps } from 'class-variance-authority';

export const attachmentMediaVariants = cva(
  "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  { variants: {
    variant: { icon: '', image: 'opacity-60 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover' },
  }, defaultVariants: { variant: 'icon' } },
);

export type AttachmentMediaVariants = VariantProps<typeof attachmentMediaVariants>;
