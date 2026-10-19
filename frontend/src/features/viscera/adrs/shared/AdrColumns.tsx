/**
 * adrColumns – Column-Definitions, Filter- und Sort-Logik fuer die ADR-Tabelle.
 *
 * Extrahiert aus AdrTable.tsx als statisches, testbares Modul (keine React-Hooks).
 *
 * Exportiert:
 * - createColumns(diagrams?) → Spalten-Definitionen (Record<string, TableColumnProps>)
 * - createFilterFn(statusFilter) → Client-seitige Filterfunktion
 * - sortAdrs(rows, field, order) → Client-seitige Sortierfunktion
 */

import Chip from '@src/components/primitives/Chip/Chip';
import Link from '@src/components/primitives/Link/Link';
import Text from '@src/components/primitives/Text/Text';
import type { TableColumnProps } from '@src/components/table/TableColumn.interface';
import { routeConfig } from '@src/router.config';


import AdrStatusBadge from '../components/adr/AdrStatusBadge';
import AdrSystemsBadges from '../components/adr/AdrSystemsBadges';
import AdrTagsBadges from '../components/adr/AdrTagsBadges';

import type { Diagram } from '../../core/workspaceSchema';
import type { Adr } from '../hooks/useAdrs';

/**
 *
 */
export function createColumns(diagrams?: Diagram[]): Record<string, TableColumnProps> {
  const diagramList = diagrams ?? [];
  return {
    idString: {
      label: 'ID',
      width: '80px',
      sortable: true,
      defaultSort: 'asc',
    },
    title: {
      label: 'Title',
      search: true,
      sortable: true,
    },
    status: {
      label: 'Status',
      width: '120px',
      sortable: true,
      renderCell: (row) => <AdrStatusBadge status={row.status as Adr['status']} />,
    },
    date: {
      label: 'Date',
      width: '120px',
      sortable: true,
    },
    systems: {
      label: 'Systems',
      width: '180px',
      renderCell: (row) => <AdrSystemsBadges systems={row.systems as string[]} />,
    },
    diagrams: {
      label: 'Diagrams',
      width: '180px',
      renderCell: (row) => {
        const rows = (row.diagrams as string[] | undefined) ?? [];
        if (rows.length === 0) {
          return <Text as="span" size="sm" color="muted">–</Text>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {rows.map((key) => {
              const name = diagramList.find((d) => d.key === key)?.name ?? key;
              return (
                <Link key={key} to={`${routeConfig.adminViscera.path}?diagram=${key}`}>
                  <Chip variant="outline" size="sm">{name}</Chip>
                </Link>
              );
            })}
          </div>
        );
      },
    },
    tags: {
      label: 'Tags',
      width: '180px',
      renderCell: (row) => <AdrTagsBadges tags={row.tags as string[]} />,
    },
  };
}

/**
 *
 */
export function createFilterFn(statusFilter: string) {
  return (rows: Adr[], q: string): Adr[] => {
    const query = q.toLowerCase().trim();
    return rows.filter((adr) => {
      const matchesSearch =
        !query ||
        adr.title.toLowerCase().includes(query) ||
        adr.tags.some((t) => t.toLowerCase().includes(query));
      const matchesStatus = !statusFilter || adr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };
}

/**
 *
 */
export function sortAdrs(rows: Adr[], field: string, order: string): Adr[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'date':
        return a.date.localeCompare(b.date) * dir;
      case 'status':
        return a.status.localeCompare(b.status) * dir;
      case 'idString':
      default: {
        const aNum = parseInt(a.idString, 10);
        const bNum = parseInt(b.idString, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * dir;
        return a.idString.localeCompare(b.idString) * dir;
      }
    }
  });
}
