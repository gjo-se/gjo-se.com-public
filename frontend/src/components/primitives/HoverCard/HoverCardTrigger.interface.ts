import type { HoverCardTriggerVariants } from './HoverCardTrigger.variants';

export interface HoverCardTriggerProps extends Omit<HoverCardTriggerVariants, 'className' | 'style'> {
  children?: React.ReactNode;
  [key: string]: unknown;
}
