import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import type { AttachmentTriggerProps } from './AttachmentTrigger.interface';

/**
 *
 */
export default function AttachmentTrigger({ render, type, ...props }: AttachmentTriggerProps) {
  return useRender({ defaultTagName: 'button', props: mergeProps<'button'>({ type: render ? type : (type ?? 'button'), className: cn('absolute inset-0 z-10 outline-none') }, props), render, state: { slot: 'attachment-trigger' } });
}
