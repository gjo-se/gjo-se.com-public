import { cva, type VariantProps } from 'class-variance-authority';

/** Sticky-Suchleiste mit eigenem Surface-Hintergrund. */
export const sideSearchVariants = cva('sticky top-0 z-20 -mx-4 px-4 pb-4 pt-2 bg-surface');

export type SideSearchVariants = VariantProps<typeof sideSearchVariants>;
