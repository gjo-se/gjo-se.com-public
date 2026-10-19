import { cva, type VariantProps } from 'class-variance-authority';

export const tableRowVariants = cva(
    'border-b border-gray-100 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800/50 dark:data-[state=selected]:bg-gray-800',
  {
    variants: {
      muted: {
        true: 'opacity-50',
        false: '',
      },
      /**
       * Zeilen-Varianten (geschlossene API – ersetzt das frühere freie
       * `getRowClassName`). `group` = Gruppierungs-Kopfzeile in Vergleichstabellen.
       */
      variant: {
        default: '',
        group: 'border-t bg-muted/20 font-semibold',
      },
    },
    defaultVariants: {
      muted: false,
      variant: 'default',
    },
  },
);

export type TableRowVariants = VariantProps<typeof tableRowVariants>;
