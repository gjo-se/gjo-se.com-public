import type { MenubarTriggerVariants } from './MenubarTrigger.variants';

export interface MenubarTriggerProps extends MenubarTriggerVariants {
  children?: React.ReactNode;
  [key: string]: unknown;
}
