/**
 * queries – TanStack Query queryOptions factory.
 *
 * Bündelt queryKey + queryFn in einem queryOptions-Objekt.
 * Per TkDodo (TanStack Query Maintainer): queryOptions statt
 * Custom-Hook-wrapping ist die kanonische Abstraktion.
 */

import { queryOptions } from '@tanstack/react-query';

/**
 * Erzeugt queryOptions für einen paginierten Listen-Endpoint.
 *
 * @param entity  - Entity-Name für den Cache-Key (z. B. 'portfolios')
 * @param fetchFn - API-Funktion, die `{ items, total }` zurückgibt
 */
export function createListQuery<TItem, TFilters>(
  entity: string,
  fetchFn: (filters: TFilters) => Promise<{ items: TItem[]; total: number }>,
) {
  return (filters: TFilters) =>
    queryOptions({
      queryKey: [entity, 'list', filters],
      queryFn: () => fetchFn(filters),
    });
}
