import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import { itemVariants } from './Item.variants';

import type { ItemProps } from './Item.interface';

/**
 * Item – Flexible list item with variants, render-prop support.
 */
export default function Item({
  variant = 'default',
  size = 'default',
  render,
  ...domProps
}: ItemProps & { render?: useRender.ComponentProps<'div'>['render'] }) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(itemVariants({ variant, size })),
      },
      domProps,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  });
}
