import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import { buttonGroupTextVariants } from './ButtonGroupText.variants';

import type { ButtonGroupTextProps } from './ButtonGroupText.interface';
/**
 *
 */
export default function ButtonGroupText({ render, ...props }: ButtonGroupTextProps) {
  return useRender({ defaultTagName: 'div', props: mergeProps<'div'>({ className: cn(buttonGroupTextVariants()) }, props), render, state: { slot: 'button-group-text' } });
}
