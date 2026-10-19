import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogTriggerVariants } from './DialogTrigger.variants';

import type { DialogTriggerProps } from './DialogTrigger.interface';

/** DialogTrigger – Button that opens the dialog. */
export default function DialogTrigger({ children, className, ...domProps }: DialogTriggerProps) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      className={cn(dialogTriggerVariants(), className)}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Trigger>
  );
}
