import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@src/lib/utils';

import { tabsContentVariants } from './TabsContent.variants';

import type { TabsContentProps } from './TabsContent.interface';

/** TabsContent – Content panel shown when its associated tab is active. */
export default function TabsContent({ children, ...domProps }: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(tabsContentVariants())}
      {...domProps}
    >
      {children}
    </TabsPrimitive.Panel>
  );
}
