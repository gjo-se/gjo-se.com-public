import { cn } from '@src/lib/utils';

import { cardDescriptionVariants } from './CardDescription.variants';

import type { CardDescriptionProps } from './CardDescription.interface';

/** CardDescription – Beschreibungstext innerhalb von CardHeader. */
export default function CardDescription({ children, ...domProps }: CardDescriptionProps) {
  return (
    <div data-slot="card-description" className={cn(cardDescriptionVariants())} {...domProps}>
      {children}
    </div>
  );
}
