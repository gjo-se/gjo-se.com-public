/** Container-Look je Priority (Dummy: high = volle Breite + Kupfer-Akzent, medium = halb, base = Drittel/muted). */
export const CARD_CONTAINER = [
  'group flex cursor-pointer flex-col gap-4 rounded-lg p-6 transition duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ring',
  'sm:p-8',
];

export const CONTAINER_BY_PRIORITY: Record<string, string> = {
  high: 'sm:col-span-6 border border-primary-subtle-border bg-surface-container shadow-md hover:border-primary hover:shadow-lg',
  medium: 'sm:col-span-3 border border-border-light bg-surface-container shadow-sm hover:border-border-heavy hover:shadow-md',
  base: 'sm:col-span-2 border border-border-light bg-surface-muted hover:border-border hover:shadow-sm',
};

/** Mono-Badge-Stil: high (Kupfer-Gruppe) betont via Primary-Subtle, neutral sonst. */
export const BADGE_BASE = 'rounded-full border px-2.5 py-1';

export const BADGE_BY_PRIORITY: Record<string, string> = {
  high: 'border-primary-subtle-border bg-primary-subtle-bg text-primary-subtle-text',
  medium: 'border-border bg-surface text-on-surface-secondary',
  base: 'border-border bg-surface text-on-surface-secondary',
};
