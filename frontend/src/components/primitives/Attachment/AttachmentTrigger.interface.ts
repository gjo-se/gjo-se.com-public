import type { useRender } from '@base-ui/react/use-render';
import type { ComponentPropsWithoutRef } from 'react';

export interface AttachmentTriggerProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  render?: useRender.ComponentProps<'button'>['render'];
  type?: 'button' | 'submit' | 'reset';
}
