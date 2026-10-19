import { cn } from '../../../lib/utils';

import { outputVariants } from './Output.variants';

import type { OutputProps } from './Output.interface';

/** Renders a labelled output field for form results. */
export default function Output({
  variant = 'default',
  children,
  id,
  name,
  form,
  htmlFor,
}: OutputProps) {
  return (
    <output
      id={id}
      name={name}
      form={form}
      htmlFor={htmlFor}
      className={cn(
        outputVariants({ variant }),
      )}
    >
      {children}
    </output>
  );
}

export type { OutputProps } from './Output.interface';
export type { OutputVariants } from './Output.variants';
