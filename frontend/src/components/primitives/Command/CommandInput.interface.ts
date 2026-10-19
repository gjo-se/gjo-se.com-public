import type { CommandInputVariants } from './CommandInput.variants';

export interface CommandInputProps
  extends Omit<CommandInputVariants, 'className' | 'style'>,
    Record<string, unknown> {}
