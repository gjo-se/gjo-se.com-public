import type { MenubarContentVariants } from './MenubarContent.variants';
export interface MenubarContentProps extends MenubarContentVariants { children?: React.ReactNode; align?: 'start' | 'center' | 'end'; alignOffset?: number; sideOffset?: number; [key: string]: unknown; }
