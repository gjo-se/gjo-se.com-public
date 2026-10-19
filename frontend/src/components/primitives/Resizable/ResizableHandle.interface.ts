import type { ResizableHandleVariants } from './ResizableHandle.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ResizableHandleProps extends ResizableHandleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { withHandle?: boolean; children?: React.ReactNode; }
