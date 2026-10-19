import { cva, type VariantProps } from 'class-variance-authority';

/** Umschalter „Automatisch/Manuell" (Segment-Control). */
export const enrichModeSwitchVariants = cva('inline-flex gap-1 rounded-md border p-0.5');

/** Ergebnis-Panel des Enrichment-Laufs. */
export const enrichResultPanelVariants = cva('flex flex-col gap-3 rounded-md border p-4');

export type ProjectEnrichDialogVariants = VariantProps<typeof enrichModeSwitchVariants>;
