import { cn } from '@src/lib/utils';

import { cardContentVariants } from './CardContent.variants';

import type { CardContentProps } from './CardContent.interface';

/** CardContent – Inhaltsbereich mit horizontalem Padding. */
export default function CardContent({ children, ...domProps }: CardContentProps) {
  return (
    <div data-slot="card-content" className={cn(cardContentVariants())} {...domProps}>
      {children}
    </div>
  );
}
