import type { Row, Table } from '@tanstack/react-table';

export interface TableRendererProps<TData> {
  table: Table<TData>;
  tableKey?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Row<TData>) => void;
  activeRowId?: string;
  /** Optional, additive: Zeilen-Variante (z. B. `group` für Gruppierungs-Kopfzeilen). */
  getRowVariant?: (row: TData) => 'default' | 'group' | undefined;
  /** Optional ghost row rendered as the first row in the table body. */
  ghostRowElement?: React.ReactNode;
  /** Optional footer element rendered inside the table (e.g. <tfoot>). */
  footerElement?: React.ReactNode;
}
