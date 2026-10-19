import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@src/lib/utils';

import { tabsVariants } from './Tabs.variants';

import type { TabsProps } from './Tabs.interface';

/**
 * Tabs – Tab navigation with button list and content panels.
 */
export default function Tabs({
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  children,
  ...domProps
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn(tabsVariants())}
      {...domProps}
    >
      {children}
    </TabsPrimitive.Root>
  );
}
