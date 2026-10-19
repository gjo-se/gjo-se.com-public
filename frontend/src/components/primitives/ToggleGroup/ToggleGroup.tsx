import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import React from 'react';

import { cn } from '@src/lib/utils';

import { toggleGroupVariants } from './ToggleGroup.variants';
import { ToggleGroupContext } from './useToggleGroup';

import type { ToggleGroupProps } from './ToggleGroup.interface';

/** ToggleGroup – Group of toggle buttons with shared variant/size context. */
export default function ToggleGroup({
  variant, size, spacing = 2, orientation = 'horizontal', children, ...domProps
}: ToggleGroupProps) {
  const contextValue = React.useMemo(
    () => ({ variant, size, spacing, orientation }),
    [variant, size, spacing, orientation],
  );
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ '--gap': spacing } as React.CSSProperties}
      className={cn(toggleGroupVariants())}
      {...domProps}
    >
      <ToggleGroupContext.Provider value={contextValue}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}
