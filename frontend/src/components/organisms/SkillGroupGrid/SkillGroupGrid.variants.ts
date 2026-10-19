import { cva, type VariantProps } from 'class-variance-authority';

/** Screenreader-only Sektionslabel der Gruppen-Übersicht. */
export const skillGridSrOnlyVariants = cva('sr-only');

/** CTA-Zeile der Gruppen-Karte („Radar öffnen"). */
export const skillGridCtaVariants = cva('mt-auto inline-flex items-center gap-1.5 text-primary');

export type SkillGroupGridVariants = VariantProps<typeof skillGridSrOnlyVariants>;
