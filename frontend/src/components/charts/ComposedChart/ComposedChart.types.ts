import type { ComposedChartProps } from './ComposedChart.interface';

/** A single bar-series definition (element of `chartProps.bars`). */
export type ComposedChartBar = ComposedChartProps['chartProps']['bars'][number];

/** A single line-series definition (element of `chartProps.lines`). */
export type ComposedChartLine = NonNullable<ComposedChartProps['chartProps']['lines']>[number];
