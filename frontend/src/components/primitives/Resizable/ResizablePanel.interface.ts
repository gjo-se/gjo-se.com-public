import type { ResizablePanelVariants } from './ResizablePanel.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ResizablePanelProps extends ResizablePanelVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
