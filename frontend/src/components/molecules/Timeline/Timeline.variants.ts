import { cva, type VariantProps } from 'class-variance-authority';

/** Punkt-Marker der Zeitleiste. */
export const timelineDotVariants = cva(
  'mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-surface',
);

/** Verbindungslinie zwischen zwei Einträgen. */
export const timelineConnectorVariants = cva('mt-1 w-0.5 flex-1 bg-surface-container-hover');

export type TimelineVariants = VariantProps<typeof timelineDotVariants>;
