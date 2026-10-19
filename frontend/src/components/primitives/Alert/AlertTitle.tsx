import { cn } from '@src/lib/utils';

import { alertTitleVariants } from './AlertTitle.variants';

import type { AlertTitleProps } from './AlertTitle.interface';

/** AlertTitle – Bold heading inside an Alert. */
export default function AlertTitle({ children, ...domProps }: AlertTitleProps) {
  return <div data-slot="alert-title" className={cn(alertTitleVariants())} {...domProps}>{children}</div>;
}
