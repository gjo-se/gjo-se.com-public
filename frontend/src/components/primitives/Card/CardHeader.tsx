import { cn } from '@src/lib/utils';

import { cardHeaderVariants } from './CardHeader.variants';

import type { CardHeaderProps } from './CardHeader.interface';

/** CardHeader – Header-Sektion mit Grid-Layout für Titel, Beschreibung und Aktion. */
export default function CardHeader({ children, ...domProps }: CardHeaderProps) {
  return (
    <div data-slot="card-header" className={cn(cardHeaderVariants())} {...domProps}>
      {children}
    </div>
  );
}
