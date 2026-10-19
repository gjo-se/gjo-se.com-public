import { cva, type VariantProps } from 'class-variance-authority';

export const dialogContentVariants = cva(
  'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg outline-none',
  {
    variants: {
      side: {
        dialog:
          'top-1/2 left-1/2 grid w-full max-w-dialog -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl p-6 ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
        left:
          'inset-y-0 left-0 h-full w-3/4 border-r transition duration-200 ease-in-out sm:max-w-sm data-ending-style:-translate-x-10 data-ending-style:opacity-0 data-starting-style:-translate-x-10 data-starting-style:opacity-0',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l transition duration-200 ease-in-out sm:max-w-sm data-ending-style:translate-x-10 data-ending-style:opacity-0 data-starting-style:translate-x-10 data-starting-style:opacity-0',
        top:
          'inset-x-0 top-0 h-auto border-b transition duration-200 ease-in-out data-ending-style:-translate-y-10 data-ending-style:opacity-0 data-starting-style:-translate-y-10 data-starting-style:opacity-0',
        bottom:
          'inset-x-0 bottom-0 h-auto border-t transition duration-200 ease-in-out data-ending-style:translate-y-10 data-ending-style:opacity-0 data-starting-style:translate-y-10 data-starting-style:opacity-0',
      },
      size: {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-2xl',
        '2xl': 'sm:max-w-3xl',
        full: 'sm:max-w-5xl lg:max-w-6xl',
      },
    },
    defaultVariants: {
      side: 'dialog',
      size: 'md',
    },
  });

export type DialogContentVariants = VariantProps<typeof dialogContentVariants>;
