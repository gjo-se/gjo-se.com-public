/**
 * AdrTable – Client-seitige Tabelle fuer Architecture Decision Records.
 *
 * Spalten: ID, Title, Status (Badge), Date, Systems (Badges), Tags (Badges)
 * Features: Suche (Title + Tags), Status-Filter, Sortierung (ID/Title/Date/Status),
 *           2s-Polling fuer Live-Updates, Zeilen-Klick → ADR-Editor-Route.
 *
 * Datenquelle: architecture/adr/*.md via Vite-Middleware + HTTP-Polling.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import Alert from '@src/components/primitives/Alert/Alert';
import AlertDescription from '@src/components/primitives/Alert/AlertDescription';
import { buildTableState } from '@src/components/table/buildTableState';
import Table from '@src/components/table/Table';
import { useClientSideTable } from '@src/components/table/useClientSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { routeConfig } from '@src/router.config';

import { useWorkspace } from '../../../core/useWorkspace';
import { loadAllAdrs, type Adr } from '../../hooks/useAdrs';
import { createColumns, createFilterFn, sortAdrs } from '../../shared/AdrColumns';

import AdrToolbar from './AdrToolbar';

import type { Diagram } from '../../../core/workspaceSchema';

const TABLE_KEY = 'admin-architecture-adrs';
const POLLING_INTERVAL_MS = 2000;

/**
 * Client-seitige ADR-Tabelle mit Suche, Status-Filter, Sortierung und Polling.
 * Spalten-Definitionen, Filter- und Sortierlogik sind in adrColumns.tsx ausgelagert.
 */
export default function AdrTable() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';
  const { workspace } = useWorkspace();

  const filterFn = useMemo(() => createFilterFn(statusFilter), [statusFilter]);

  const {
    data,
    total,
    q,
    page,
    size,
    sort,
    order,
    tableKey,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
    reload,
    loading,
    error,
    defaultSort,
  } = useClientSideTable<Adr>({
    tableKey: TABLE_KEY,
    loadFn: loadAllAdrs,
    filterFn,
    sortFn: sortAdrs,
    defaultSort: 'idString',
    defaultOrder: 'asc',
  });

  // Polling: Reload alle 2s fuer Live-Updates (analog useWorkspace)
  useEffect(() => {
    const interval = setInterval(() => void reload(), POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [reload]);

  const columns = useMemo(
    () => createColumns((workspace?.diagrams ?? []) as Diagram[]),
    [workspace?.diagrams],
  );

  const rowActions = useTableActions<Adr>({
    onEdit: useCallback(
      async (row: Adr) => {
        navigate(`${routeConfig.adminVisceraAdrDetail.path}/${row.idString}`);
      },
      [navigate],
    ),
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Fehler beim Laden der ADRs: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Table<Adr>
      table={buildTableState({
        data,
        total,
        q,
        page,
        size,
        sort: sort || defaultSort,
        order: (order as 'asc' | 'desc') || 'asc',
        tableKey,
        setQ,
        setPage,
        setSize,
        setSort,
        handleSearchChange,
        resetUrlState,
      })}
      columns={columns}
      rowActions={rowActions}
      emptyMessage="Keine ADRs gefunden. Erstelle eine neue unter architecture/adr/."
      isLoading={loading}
    >
      <AdrToolbar />
    </Table>
  );
}
