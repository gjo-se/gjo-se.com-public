/**
 * AdminSearchTermsColumns – Column definitions for the Admin Search Terms table.
 *
 * Exports a Record<string, ColumnProps> consumed by the Table compound component.
 * No _actions column – row actions are defined via useTableActions in the hook.
 */

import type { TableColumnProps } from '@src/components/table';

/** Column definitions: ID (fixed width), Name (searchable, ghost: text). */
export const adminSearchTermsColumns: Record<string, TableColumnProps> = {
  id: { label: 'ID', width: '80px' },
  name: {
    label: 'Name',
    search: true,
    defaultSort: 'asc',
    ghostInput: 'text',
    ghostPlaceholder: 'Suchbegriff…',
  },
};
