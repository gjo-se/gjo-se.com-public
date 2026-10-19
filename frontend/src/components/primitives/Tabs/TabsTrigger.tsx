import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@src/lib/utils';

import { tabsTriggerVariants } from './TabsTrigger.variants';

import type { TabsTriggerProps } from './TabsTrigger.interface';

/** TabsTrigger – Button that activates its associated tab panel. */
export default function TabsTrigger({ children, ...domProps }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants())}
      {...domProps}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}
