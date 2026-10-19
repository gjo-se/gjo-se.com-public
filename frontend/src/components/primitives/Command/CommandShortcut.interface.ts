import type { CommandShortcutVariants } from './CommandShortcut.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface CommandShortcutProps extends CommandShortcutVariants, Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> { children?: React.ReactNode; }
