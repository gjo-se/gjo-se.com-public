import { Command as CommandPrimitive } from 'cmdk';

import { Dialog, DialogContent } from '@src/components/vendor/shadcn/dialog';

import type { CommandDialogProps } from './CommandDialog.interface';

/** CommandDialog – Modal dialog wrapper for Command palette. */
export default function CommandDialog({ children, ...domProps }: CommandDialogProps) {
  return <Dialog><DialogContent><CommandPrimitive {...domProps}>{children}</CommandPrimitive></DialogContent></Dialog>;
}
