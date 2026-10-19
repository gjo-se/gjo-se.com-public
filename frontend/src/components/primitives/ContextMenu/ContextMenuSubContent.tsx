import ContextMenuContent from './ContextMenuContent';

import type { ContextMenuSubContentProps } from './ContextMenuSubContent.interface';

/** ContextMenuSubContent – Nested sub-menu dropdown content. */
export default function ContextMenuSubContent({
  children, ...domProps
}: ContextMenuSubContentProps) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      {...domProps}
    >
      {children}
    </ContextMenuContent>
  );
}
