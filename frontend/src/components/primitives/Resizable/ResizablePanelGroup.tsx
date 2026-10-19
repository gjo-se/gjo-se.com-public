import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@src/lib/utils';

import { resizablePanelGroupVariants } from './ResizablePanelGroup.variants';

import type { ResizablePanelGroupProps } from './ResizablePanelGroup.interface';

/** ResizablePanelGroup – Container for resizable panels. Supports horizontal and vertical. */
export default function ResizablePanelGroup({ children, ...domProps }: ResizablePanelGroupProps) {
  return <ResizablePrimitive.Group data-slot="resizable-panel-group" className={cn(resizablePanelGroupVariants())} {...domProps}>{children}</ResizablePrimitive.Group>;
}
