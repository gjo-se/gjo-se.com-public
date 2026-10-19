import { cva } from 'class-variance-authority';

export const boardEditTriggerVariants = cva(
  'cursor-text hover:text-blue-600 dark:hover:text-blue-400',
);

export const columnSentinelVariants = cva('h-px');

export const columnShellVariants = cva('flex h-full flex-col');

export const dissolveOverlayVariants = cva(
  'pointer-events-none rounded-xl bg-blue-500/80 px-4 py-2 text-white',
);
