/**
 * Observes the first data row of the metadata table and returns its column
 * widths (used to align the description tabs).
 */
import { useLayoutEffect, useState } from 'react';

import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import type { RefObject } from 'react';

/** Measures the rendered column widths of the comparison metadata table. */
export function useProjectComparisonColumnWidths(
  columns: ComparisonColumn[],
  containerRef: RefObject<HTMLDivElement | null>,
): number[] {
  const [widths, setWidths] = useState<number[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const firstDataRow = container.querySelector<HTMLTableRowElement>('tbody tr:first-child');
      if (!firstDataRow) return;
      const cells = firstDataRow.querySelectorAll<HTMLTableCellElement>('td');
      if (cells.length === 0) return;
      const w: number[] = [];
      cells.forEach((td) => w.push(td.offsetWidth));
      setWidths((prev) => (prev.length === w.length && prev.every((v, i) => v === w[i]) ? prev : w));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [columns, containerRef]);

  return widths;
}
