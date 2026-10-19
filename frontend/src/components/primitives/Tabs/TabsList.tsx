import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@src/lib/utils';

import { tabsListVariants } from './TabsList.variants';

import type { TabsListProps } from './TabsList.interface';

/** TabsList – Container for tab trigger buttons. */
export default function TabsList({ variant = 'default', children, ...domProps }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }))}
      {...domProps}
    >
      {children}
    </TabsPrimitive.List>
  );
}
