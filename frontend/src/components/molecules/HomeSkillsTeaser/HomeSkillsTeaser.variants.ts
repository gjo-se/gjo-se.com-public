import { cva, type VariantProps } from 'class-variance-authority';

/** Skill-Badge der Kompetenz-Karten (Pill mit Haarlinie). */
export const homeSkillsBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-border bg-surface-container px-2.5 py-1',
);

/** Zentrierte CTA-Zeile unter dem Karten-Grid. */
export const homeSkillsCtaVariants = cva('mt-12 text-center');

export type HomeSkillsTeaserVariants = VariantProps<typeof homeSkillsBadgeVariants>;
