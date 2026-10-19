import { cva, type VariantProps } from 'class-variance-authority';

export const listVariants = cva('text-sm', {
  variants: {
    listStyle: {
      default: 'list-inside list-disc text-on-surface-secondary',
      none: 'list-none text-on-surface-secondary',
      disc: 'list-inside list-disc text-on-surface-secondary',
      decimal: 'list-inside list-decimal text-on-surface-secondary',
    },
    spacing: {
      default: '',
      spaced: 'space-y-1',
    },
    /**
     * Layout-Modus als Grid (Arrange) am semantischen Listen-Element – damit
     * `ul`/`ol`/`dl`-Layout ohne `className` und ohne Semantik-Verlust möglich ist.
     * `columns` = Basis-Spalten, `columnsMd` = Spalten ab `md`, `gapX`/`gapY` = Raster.
     */
    columns: {
      1: 'grid grid-cols-1',
      2: 'grid grid-cols-2',
      3: 'grid grid-cols-3',
    },
    columnsMd: {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
    },
    gapX: {
      4: 'gap-x-4',
      8: 'gap-x-8',
      10: 'gap-x-10',
    },
    gapY: {
      4: 'gap-y-4',
      8: 'gap-y-8',
      10: 'gap-y-10',
    },
  },
  defaultVariants: {
    listStyle: 'default',
    spacing: 'default',
  },
});

export type ListVariants = VariantProps<typeof listVariants>;
