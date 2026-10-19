/** Size configuration for icon and dot dimensions. */
export const SIZE_CONFIG = {
  sm: { icon: 'xs' as const, dot: 'w-1.5 h-1.5', text: 'xs' as const },
  md: { icon: 'sm' as const, dot: 'w-2 h-2', text: 'sm' as const },
} as const;
