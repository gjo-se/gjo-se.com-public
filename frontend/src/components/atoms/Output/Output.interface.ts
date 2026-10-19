import type { OutputVariants } from './Output.variants';
import type { OutputHTMLAttributes } from 'react';

export interface OutputProps extends OutputVariants, Omit<OutputHTMLAttributes<HTMLOutputElement>, 'className' | 'style'> {
  children: React.ReactNode
}
