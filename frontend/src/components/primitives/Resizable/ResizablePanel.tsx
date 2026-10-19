import * as ResizablePrimitive from 'react-resizable-panels';

import type { ResizablePanelProps } from './ResizablePanel.interface';

/** ResizablePanel – A single resizable panel inside a ResizablePanelGroup. */
export default function ResizablePanel({ children, ...domProps }: ResizablePanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...domProps}>{children}</ResizablePrimitive.Panel>;
}
