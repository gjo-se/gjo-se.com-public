import { cn } from '@src/lib/utils';

import { alertDescriptionVariants } from './AlertDescription.variants';

import type { AlertDescriptionProps } from './AlertDescription.interface';

/** AlertDescription – Secondary text inside an Alert. */
export default function AlertDescription({ children, ...domProps }: AlertDescriptionProps) {
  return <div data-slot="alert-description" className={cn(alertDescriptionVariants())} {...domProps}>{children}</div>;
}
