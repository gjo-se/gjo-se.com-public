import type { MessageScrollerItemVariants } from './MessageScrollerItem.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface MessageScrollerItemProps extends MessageScrollerItemVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { scrollAnchor?: boolean; children?: React.ReactNode; }
