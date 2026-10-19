import { cva, type VariantProps } from 'class-variance-authority';

export const groupVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
    },
    fullHeight: {
      true: 'h-full',
      false: '',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      reverse: 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    direction: 'row',
    fullHeight: false,
    fullWidth: false,
    gap: 2,
    align: 'center',
    justify: 'start',
    wrap: 'wrap',
  },
});

export type GroupVariants = VariantProps<typeof groupVariants>;
