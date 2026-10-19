import { cloneElement, isValidElement, useMemo } from 'react';

import type { TableColumnProps } from './TableColumn.interface';

/**
 *
 */
export function useTableFilters(
  columns: Record<string, TableColumnProps>,
  urlState: Record<string, unknown>,
): React.ReactElement[] {
  return useMemo(
    () =>
      Object.entries(columns)
        .filter(([, col]) => col.filter != null)
        .map(([key, col]) => {
          const element = typeof col.filter === 'function' ? col.filter!(urlState) : col.filter!;
          return isValidElement(element) ? { key, element } : null;
        })
        .filter((item): item is { key: string; element: React.ReactElement } => item != null)
        .map(({ key, element }) => cloneElement(element, { key, ...urlState })),
    [columns, urlState],
  );
}
