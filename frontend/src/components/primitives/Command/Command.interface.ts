import type { ReactNode } from 'react';

export interface CommandProps {
  children?: ReactNode;
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** When false, disables cmdk's built-in filtering (useful when using external fuzzy search). */
  shouldFilter?: boolean;
}
