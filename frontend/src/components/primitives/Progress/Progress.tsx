import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@src/lib/utils';

import { progressVariants } from './Progress.variants';

import type { ProgressProps } from './Progress.interface';

/**
 * Progress – Visual indicator for completion or loading.
 */
export default function Progress({
  value,
  max = 100,
  label,
  size = 'default',
  id,
  ...domProps
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between text-sm font-medium">
          <label htmlFor={id}>{label}</label>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        id={id}
        value={clamped}
        max={max}
        className={cn(progressVariants({ size }))}
        {...domProps}
      >
        <ProgressPrimitive.Track className="h-full w-full">
          <ProgressPrimitive.Indicator
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </ProgressPrimitive.Track>
      </ProgressPrimitive.Root>
    </div>
  );
}
