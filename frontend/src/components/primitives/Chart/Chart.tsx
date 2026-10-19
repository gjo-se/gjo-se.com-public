import { cn } from '@src/lib/utils';

import { chartVariants } from './Chart.variants';

import type { ChartProps } from './Chart.interface';

/**
 * Chart – Styled container for Recharts visualizations.
 * Wrap with ChartContext for config/theme context.
 */
export default function Chart({ children, ...domProps }: ChartProps) {
  return (
    <div data-slot="chart" className={cn(chartVariants())} {...domProps}>
      {children}
    </div>
  );
}
