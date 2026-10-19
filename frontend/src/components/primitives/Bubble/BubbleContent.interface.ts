import type { BubbleContentVariants } from './BubbleContent.variants';
import type { useRender } from '@base-ui/react/use-render';
import type { ComponentPropsWithoutRef } from 'react';
export interface BubbleContentProps extends BubbleContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { render?: useRender.ComponentProps<'div'>['render']; }
