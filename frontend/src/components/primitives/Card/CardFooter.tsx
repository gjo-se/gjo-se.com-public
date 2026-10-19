import { cn } from '@src/lib/utils';

import { cardFooterVariants } from './CardFooter.variants';

import type { CardFooterProps } from './CardFooter.interface';

/** CardFooter – Footer-Sektion, typischerweise mit Aktionen. */
export default function CardFooter({ children, ...domProps }: CardFooterProps) {
  return (
    <div data-slot="card-footer" className={cn(cardFooterVariants())} {...domProps}>
      {children}
    </div>
  );
}
