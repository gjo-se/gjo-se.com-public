import type { MenubarItemVariants } from './MenubarItem.variants';
export interface MenubarItemProps extends MenubarItemVariants { children?: React.ReactNode; inset?: boolean; variant?: 'default' | 'destructive'; [key: string]: unknown; }
