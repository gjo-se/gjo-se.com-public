/**
 * createStatusColumns – Column definitions for the Core Status table.
 *
 * Columns: Name, Category, Color Token (dot + name), Description,
 * Sort Order – searchable, sortable, inline-editable.
 * Pattern reference: features/core/components/createDefinitionBaseColumns.ts
 */

import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import type { TableColumnProps } from '@src/components/table';

import { createDefinitionBaseColumns } from '../utils/createDefinitionBaseColumns';


/** Column definitions – includes ghost placeholders and inline edit config. */
export function createStatusColumns(): Record<string, TableColumnProps> {
  return createDefinitionBaseColumns('Status-Name…');
}

/** Standard status category options for the toolbar filter dropdown. */
export const STATUS_CATEGORY_OPTIONS: DropdownItem[] = [
  { value: 'all', label: 'Alle' },
  { value: 'lifecycle', label: 'Lifecycle' },
  { value: 'triage', label: 'Triage' },
];
