import { cn } from '@src/lib/utils';

import { alertActionVariants } from './AlertAction.variants';

import type { AlertActionProps } from './AlertAction.interface';

/** AlertAction – Action button area positioned at the top-right of an Alert. */
export default function AlertAction({ children, ...domProps }: AlertActionProps) {
  return <div data-slot="alert-action" className={cn(alertActionVariants())} {...domProps}>{children}</div>;
}
