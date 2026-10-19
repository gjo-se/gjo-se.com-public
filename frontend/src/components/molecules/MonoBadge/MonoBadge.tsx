import { monoBadgeVariants } from './MonoBadge.variants';

interface MonoBadgeProps {
  children: string;
}

/** Mono chip (badge) used by the public Code-&-Karriere cards. */
export default function MonoBadge({ children }: MonoBadgeProps) {
  return (
    <div className={monoBadgeVariants()}>
      {children}
    </div>
  );
}

export type { MonoBadgeVariants } from './MonoBadge.variants';
