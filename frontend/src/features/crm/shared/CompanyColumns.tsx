/**
 * CompanyColumns – Column definitions for the CRM Companies table.
 *
 * Columns: ID, Name (plain text), City (primary), Country (primary),
 * Kununu Score – all sortable server-side.
 */

import type { TableColumnProps } from '@src/components/table';

import { renderTagsCell } from './RenderTagsCell';

/** Column definitions for the company list: ID, Name, City, Country, Kununu Score, Tags. */
export function createCompanyColumns(): Record<string, TableColumnProps> {
  return {
    id: {
      label: 'ID',
      width: '80px',
      sortable: true,
      alignment: 'left',
    },
    name: {
      label: 'Name',
      search: true,
      sortable: true,
      defaultSort: 'asc',
      ghostInput: 'text',
      ghostPlaceholder: 'Firmenname',
    },
    primary_city: {
      label: 'City',
      search: true,
      sortable: true,
    },
    primary_country: {
      label: 'Country',
      sortable: true,
    },
    kununu_score: {
      label: 'Kununu Score',
      sortable: true,
      alignment: 'right',
    },
    tags: {
      label: 'Tags',
      width: '200px',
      renderCell: renderTagsCell,
    },
  };
}
