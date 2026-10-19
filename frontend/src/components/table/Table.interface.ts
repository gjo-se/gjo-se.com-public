
import type { TableColumnProps } from './TableColumn.interface';
import type { TableRowActionsProps } from './TableRowActions.interface';
import type { TableStateProps } from './TableState.interface';
import type { ReactNode } from 'react';

/** A bulk action operating on the currently selected rows. */
export interface TableBulkActionProps<T> {
  key: string;
  label: string;
  variant?: 'default' | 'destructive' | 'secondary';
  onAction: (rows: T[]) => void | Promise<void>;
}

export interface TableProps<T> {
  table: TableStateProps<T>;
  columns: Record<string, TableColumnProps>;
  rowActions?: TableRowActionsProps<T>[];
  emptyMessage?: string;
  onReset?: () => void;
  /** Optional, additive: Zeilen-Variante (z. B. `group` für Gruppierungs-Kopfzeilen). */
  getRowVariant?: (row: T) => 'default' | 'group' | undefined;
  /** Show a non-blocking loading overlay while keeping existing data visible. */
  isLoading?: boolean;
  /** Optional: enables a selection checkbox column + a bulk-action bar. */
  bulkActions?: TableBulkActionProps<T>[];
  // ── Ghost Row ──
  /** Enable the ghost-row inline-create pattern (Cmd+Enter to open). */
  ghostRow?: boolean;
  /** Called when the ghost row is committed (Enter). Receives column-key → value map. */
  onGhostCreate?: (data: Record<string, unknown>) => Promise<unknown>;
  /** Rendered inside the toolbar between filter elements and the Reset button. */
  children?: ReactNode;
  /** Optional footer element rendered inside the table (e.g. <tfoot>). */
  footer?: ReactNode;
}
