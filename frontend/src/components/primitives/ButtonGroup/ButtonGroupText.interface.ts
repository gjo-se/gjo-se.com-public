import type { ButtonGroupTextVariants } from './ButtonGroupText.variants';
import type { useRender } from '@base-ui/react/use-render';
import type { ComponentPropsWithoutRef } from 'react';
export interface ButtonGroupTextProps extends ButtonGroupTextVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { render?: useRender.ComponentProps<'div'>['render']; }
