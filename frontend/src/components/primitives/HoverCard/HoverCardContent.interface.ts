import type { HoverCardContentVariants } from './HoverCardContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface HoverCardContentProps
  extends HoverCardContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  side?: 'bottom' | 'top' | 'left' | 'right';
  sideOffset?: number;
  align?: 'center' | 'start' | 'end';
  alignOffset?: number;
  children?: React.ReactNode;
}
