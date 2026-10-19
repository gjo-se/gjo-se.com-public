import type { CommandItemVariants } from './CommandItem.variants';

export interface CommandItemProps extends CommandItemVariants {
  children?: React.ReactNode;
  [key: string]: unknown;
}
