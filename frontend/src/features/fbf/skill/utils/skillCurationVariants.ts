import { cva } from 'class-variance-authority';

export const cellEditTriggerVariants = cva(
  'cursor-text select-none hover:text-blue-600 dark:hover:text-blue-400',
);

export const sortDialogScrollVariants = cva(
  'flex max-h-96 flex-col gap-2 overflow-y-auto',
);
