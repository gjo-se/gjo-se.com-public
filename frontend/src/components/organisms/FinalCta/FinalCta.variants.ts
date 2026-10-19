import { cva, type VariantProps } from 'class-variance-authority';

/** Zentrierte Inhaltsbreite des Final-CTA-Blocks. */
export const finalCtaInnerVariants = cva('mx-auto max-w-measure');

/** Notaus-Knopf: äußerer Ring + innerer Kupferkreis. */
export const finalCtaKnobVariants = cva(
  'finalcta__group relative mt-8 h-44 w-44 overflow-hidden rounded-full border-2 border-border-heavy',
);

/** Puls-Signal zwischen innerem Kreis und äußerem Ring. */
export const finalCtaRingVariants = cva('finalcta__ring absolute inset-4');

export type FinalCtaVariants = VariantProps<typeof finalCtaInnerVariants>;
