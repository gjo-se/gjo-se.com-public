import type { CommandDialogVariants } from './CommandDialog.variants';

export interface CommandDialogProps extends CommandDialogVariants {
  children?: React.ReactNode;
  [key: string]: unknown;
}
