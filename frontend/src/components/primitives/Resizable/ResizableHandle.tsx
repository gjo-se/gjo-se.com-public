import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@src/lib/utils';

import { resizableHandleVariants } from './ResizableHandle.variants';

import type { ResizableHandleProps } from './ResizableHandle.interface';

/** ResizableHandle – Draggable divider between ResizablePanels. */
export default function ResizableHandle({ withHandle, ...domProps }: ResizableHandleProps) {
  return (
    <ResizablePrimitive.Separator data-slot="resizable-handle" className={cn(resizableHandleVariants())} {...domProps}>
      {withHandle && <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />}
    </ResizablePrimitive.Separator>
  );
}
