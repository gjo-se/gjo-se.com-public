import { cn } from '@src/lib/utils';

import { cardVariants } from './Card.variants';

import type { CardProps } from './Card.interface';

/** Card – Generischer Layout-Container mit Border, Shadow und Padding. */
export default function Card({ variant = 'default', size = 'default', children, ...domProps }: CardProps) {
  return (
    <div data-slot="card" data-size={size} className={cn(cardVariants({ variant, size }))} {...domProps}>
      {children}
    </div>
  );
}
