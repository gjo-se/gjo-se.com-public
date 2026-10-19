import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Container-Breitenstufen – token-basiert über die Tailwind-Skala (nie arbitrary).
 *
 * `wide`    = Seiten-Container-Rhythmus (`max-w-6xl`, identisch zum DefaultLayout).
 * `content` = Inhalts-/Formularspalte (`max-w-3xl`).
 * `prose`   = Lesemaß für Fließtext (`max-w-prose`, ~65ch).
 * `card`    = kompakte Panel-/Kartenbreite (`max-w-md`).
 */
export const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      wide: 'max-w-6xl',
      content: 'max-w-3xl',
      prose: 'max-w-prose',
      card: 'max-w-md',
    },
    /** Horizontales Container-Padding (`px-6`) – Default aus (Padding kommt vom Seitenrahmen). */
    padded: {
      true: 'px-6',
      false: '',
    },
  },
  defaultVariants: {
    size: 'wide',
    padded: false,
  },
});

export type ContainerVariants = VariantProps<typeof containerVariants>;
