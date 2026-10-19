import type { Table } from '@tanstack/react-table';

export interface TablePaginationProps<TData> {
  table: Table<TData>;
  totalCount?: number;
}
