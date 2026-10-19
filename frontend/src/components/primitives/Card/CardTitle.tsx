import { cn } from '@src/lib/utils';

import { cardTitleVariants } from './CardTitle.variants';

import type { CardTitleProps } from './CardTitle.interface';

/** CardTitle – Titelzeile innerhalb von CardHeader. */
export default function CardTitle({ children, ...domProps }: CardTitleProps) {
  return (
    <div data-slot="card-title" className={cn(cardTitleVariants())} {...domProps}>
      {children}
    </div>
  );
}
