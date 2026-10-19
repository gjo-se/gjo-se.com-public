import type { ResizablePanelGroupVariants } from './ResizablePanelGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ResizablePanelGroupProps extends ResizablePanelGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
