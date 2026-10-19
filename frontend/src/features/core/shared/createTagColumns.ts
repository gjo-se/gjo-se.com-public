/**
 * createTagColumns – Column definitions for the Core Tags table.
 *
 * Columns: Name, Category, Color Token (dot + name), Description,
 * Sort Order, Usage Count – searchable, sortable, inline-editable.
 * Pattern reference: features/core/components/createDefinitionBaseColumns.ts
 */

import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import type { TableColumnProps } from '@src/components/table';

import { createDefinitionBaseColumns } from '../utils/createDefinitionBaseColumns';


/** Column definitions – includes ghost placeholders and inline edit config. */
export function createTagColumns(): Record<string, TableColumnProps> {
  return createDefinitionBaseColumns('Tag-Name…');
}

/** Standard tag category options for the toolbar filter dropdown. */
export const CATEGORY_OPTIONS: DropdownItem[] = [
  { value: 'all', label: 'Alle' },
  { value: 'Risk', label: 'Risk' },
  { value: 'Cost', label: 'Cost' },
  { value: 'Deployment', label: 'Deployment' },
  { value: 'General', label: 'General' },
];
