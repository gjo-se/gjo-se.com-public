import type { TableStateProps } from './TableState.interface';

/** Constructs a TableStateProps<T> from primitive fields — single source of truth for the contract. */
export function buildTableState<T>(params: {
  data: T[];
  total: number;
  q: string;
  page: number;
  size: number;
  sort: string;
  order: 'asc' | 'desc';
  tableKey: string;
  setQ: (value: string) => void;
  setPage: (value: number) => void;
  setSize: (value: number) => void;
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  handleSearchChange: (value: string) => void;
  resetUrlState: () => void;
}): TableStateProps<T> {
  return params;
}
