import type { HoverCardVariants } from './HoverCard.variants';

export interface HoverCardProps extends Omit<HoverCardVariants, 'className' | 'style'> {
  children?: React.ReactNode;
  [key: string]: unknown;
}
