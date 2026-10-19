import { cn } from '@src/lib/utils';

import { cardActionVariants } from './CardAction.variants';

import type { CardActionProps } from './CardAction.interface';

/** CardAction – Aktionselement oben-rechts im CardHeader-Grid. */
export default function CardAction({ children, ...domProps }: CardActionProps) {
  return (
    <div data-slot="card-action" className={cn(cardActionVariants())} {...domProps}>
      {children}
    </div>
  );
}
