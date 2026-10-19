import { cva, type VariantProps } from 'class-variance-authority';

/** Lesemaß der Display-H1 (schmale Zeilenbreite, zentriert). */
export const pageIntroTitleVariants = cva('mx-auto max-w-title');

/** USP-Zeile (Abstand, einzeilig). */
export const pageIntroUspVariants = cva('mt-6 whitespace-nowrap');

/** Subline (zentriert, Lesemaß). */
export const pageIntroSubtitleVariants = cva('mx-auto mt-4 max-w-measure');

export type PageIntroVariants = VariantProps<typeof pageIntroTitleVariants>;
