/**
 * useTechnologyCatalogTable – Feature hook for the Technology Catalog admin table.
 *
 * Server-side table with URL-synced state (q, page, size, sort, order)
 * plus provider and type filter params. Fetches paginated data from the
 * backend via fetchTechnologies + fetchTechnologyCount in parallel.
 *
 * Pattern reference: useTagDefinitionTable.ts (features/core/hooks/)
 */
import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import Text from '@src/components/primitives/Text';
import type { TableColumnProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';
import { fetchTechnologies, fetchTechnologyCount, updateTechnology, fetchIconCounts } from '@src/lib/api/technologyCatalog';
import type { TechnologyCatalogEntry } from '@src/lib/api/technologyCatalogTypes';
import { getColorBg } from '@src/lib/colorTokens';

import IconCell from '../shared/IconCell';


// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-technology-catalog';
const PROVIDER_PARAM = 'provider';
const TYPE_PARAM = 'type';

const EXTRA_PARAMS: TableParamRegistry = {
  [PROVIDER_PARAM]: {
    default: '',
    serialize: (v: unknown): string | undefined => (v ? String(v) : undefined),
  },
  [TYPE_PARAM]: {
    default: '',
    serialize: (v: unknown): string | undefined => (v ? String(v) : undefined),
  },
};

// ── Static filter options ────────────────────────────────────────────────

const PROVIDER_OPTIONS: DropdownItem[] = [
  { value: '', label: 'Alle' },
  { value: 'aws', label: 'AWS' },
  { value: 'azure', label: 'Azure' },
  { value: 'gcp', label: 'GCP' },
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'hashicorp', label: 'HashiCorp' },
  { value: 'jetbrains', label: 'JetBrains' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'red-hat', label: 'Red Hat' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'twilio', label: 'Twilio' },
];

const TYPE_OPTIONS: DropdownItem[] = [
  { value: '', label: 'Alle' },
  { value: 'ci-cd', label: 'CI/CD' },
  { value: 'cloud-platform', label: 'Cloud Platform' },
  { value: 'container', label: 'Container' },
  { value: 'data-storage', label: 'Data Storage' },
  { value: 'database', label: 'Database' },
  { value: 'dev-tool', label: 'Dev Tool' },
  { value: 'framework-library', label: 'Framework / Library' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'identity-security', label: 'Identity & Security' },
  { value: 'language', label: 'Language' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'orchestration', label: 'Orchestration' },
  { value: 'service', label: 'Service' },
];

// ── Types ────────────────────────────────────────────────────────────────

export interface UseTechnologyCatalogTableResult {
  /** Column definitions for the Table compound. */
  columns: Record<string, TableColumnProps>;
  /** Error message from the last load. */
  error: string | null;
  /** Whether data is currently loading. */
  loading: boolean;
  /** Table state for the Table compound. */
  table: TableStateProps<TechnologyCatalogEntry>;
  /** Current provider filter value. */
  providerFilter: string;
  /** Provider filter options. */
  providerOptions: DropdownItem[];
  /** Provider filter change handler. */
  onProviderFilterChange: (value: string) => void;
  /** Current type filter value. */
  typeFilter: string;
  /** Type filter options. */
  typeOptions: DropdownItem[];
  /** Type filter change handler. */
  onTypeFilterChange: (value: string) => void;
  /** Current icon filter value. */
  iconFilter: 'all' | 'loaded' | 'missing';
  /** Icon filter change handler. */
  onIconFilterChange: (value: string) => void;
  /** Icon counts: { loaded, total }. */
  iconCounts: { loaded: number; total: number };
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side table hook for Technology Catalog admin page. */
export function useTechnologyCatalogTable(): UseTechnologyCatalogTableResult {
  // ── Refs for load function ──────────────────────────────────────────
  type LoadFn = () => Promise<void>;
  const loadRef = useRef<LoadFn>(async () => {});

  // ── Server-side table state (URL-synced) ────────────────────────────
  const {
    data: rawData,
    total,
    loading,
    error,
    q,
    page,
    size,
    sort,
    order,
    tableKey,
    params,
    setQ,
    setPage,
    setSize,
    setSort,
    setParam,
    handleSearchChange,
    resetUrlState,
    executeLoad,
    defaultSort,
  } = useServerSideTable<TechnologyCatalogEntry>({
    tableKey: TABLE_KEY,
    defaultSort: 'name',
    defaultOrder: 'asc',
    extraParams: EXTRA_PARAMS,
    onSearch: () => {
      void loadRef.current();
    },
    onLoad: () => {
      void loadRef.current();
    },
  });

  const providerFilter = (params[PROVIDER_PARAM] as string) || '';
  const typeFilter = (params[TYPE_PARAM] as string) || '';

  // ── Load function (server-side: fetch + count parallel) ─────────────
  const load = useCallback(async () => {
    await executeLoad(async () => {
      const [rows, cnt] = await Promise.all([
        fetchTechnologies({
          q: q || undefined,
          provider: providerFilter || undefined,
          type: typeFilter || undefined,
          offset: page * size,
          limit: size,
          sort_by: sort || 'name',
          sort_dir: (order as 'asc' | 'desc') || 'asc',
        }),
        fetchTechnologyCount({
          q: q || undefined,
          provider: providerFilter || undefined,
          type: typeFilter || undefined,
        }),
      ]);
      return { data: rows, total: cnt };
    });
  }, [executeLoad, q, providerFilter, typeFilter, page, size, sort, order]);

  useLayoutEffect(() => {
    loadRef.current = load;
  });

  const [statusFilter, setStatusFilter] = useState('');
  const [iconFilter, setIconFilter] = useState<'all' | 'loaded' | 'missing'>('all');
  const [iconCounts, setIconCounts] = useState({ loaded: 0, total: 0 });

  // ── Fetch DB-wide icon counts on mount ───────────────────────────────
  useEffect(() => {
    fetchIconCounts()
      .then((c) => setIconCounts({ loaded: c.loaded, total: c.total }))
      .catch((err) => { console.error('fetchIconCounts failed', err); });
    const interval = setInterval(() => {
      fetchIconCounts()
        .then((c) => setIconCounts({ loaded: c.loaded, total: c.total }))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []); // fetch once on mount, then every 30s // re-fetch when rawData changes (page load/new sync)

  // ── Client-side icon filter ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (q || iconFilter === 'all') return rawData;
    return rawData.filter((entry) => {
      const hasIcon = entry.icons.some((i) => i.downloaded_at != null);
      return iconFilter === 'loaded' ? hasIcon : !hasIcon;
    });
  }, [rawData, iconFilter, q]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(0);
    void loadRef.current();
  }, [setPage]);

  // ── Columns ────────────────────────────────────────────────────────
  const columns: Record<string, TableColumnProps> = useMemo(
    () => ({
      id: {
        label: 'ID',
        width: '60px',
        alignment: 'center',
        sortable: true,
        renderCell: (row: Record<string, unknown>) => (
          <Text size="xs" color="muted">{String(row.id ?? '\u2013')}</Text>
        ),
      },
      icon: {
        label: '',
        width: '48px',
        sortable: false,
        alignment: 'center',
        renderCell: (row: Record<string, unknown>) => {
          const entry = row as unknown as TechnologyCatalogEntry;
          const { name, color_token, icons } = entry;
          const iconUrl = icons[0]?.icon_url ?? null;
          const initial = (name || '?').charAt(0).toUpperCase();
          const loaded = icons[0]?.storage_key != null;
          return (
            <IconCell
              iconUrl={iconUrl}
              name={name}
              colorToken={color_token}
              initial={initial}
              loaded={loaded}
            />
          );
        },
      },
      name: {
        label: 'Name',
        width: '180px',
        search: true,
        sortable: true,
        defaultSort: 'asc',
        filter: () => createElement(StatusFilter, {
          statusableType: 'technology_catalog',
          selectedValue: statusFilter,
          onSelect: handleStatusFilterChange,
        }),
      },
      slug: {
        label: 'Slug',
        width: '120px',
        sortable: true,
        inlineEdit: true,
        onInlineEdit: async (row, value) => {
          const trimmed = value.trim();
          if (!trimmed || row.slug === trimmed) return;
          await updateTechnology(row.id as number, { slug: trimmed });
          void loadRef.current();
        },
      },
      provider: {
        label: 'Provider',
        width: '110px',
        sortable: true,
      },
      type: {
        label: 'Type',
        width: '100px',
        sortable: true,
        inlineEdit: true,
        onInlineEdit: async (row, value) => {
          const trimmed = value.trim();
          if (!trimmed || row.type === trimmed) return;
          await updateTechnology(row.id as number, { type: trimmed });
          void loadRef.current();
        },
      },
      viscera_restrictions: {
        label: 'Viscera',
        width: '120px',
        renderCell: (row: Record<string, unknown>) => {
          const restrictions = (row.viscera_restrictions as string[] | null) ?? [];
          const display = restrictions.length > 0 ? restrictions.join(', ') : '';
          return (
            <TableInlineEditCell
              value={display}
              onSave={async (value) => {
                const trimmed = value.trim();
                const newList = trimmed ? trimmed.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                if (JSON.stringify(restrictions) === JSON.stringify(newList)) return;
                await updateTechnology(row.id as number, { viscera_restrictions: newList.length > 0 ? newList : null });
                void loadRef.current();
              }}
            />
          );
        },
      },
      description: {
        label: 'Description',
        width: '220px',
        renderCell: (row: Record<string, unknown>) => {
          const desc = String(row.description ?? '');
          return (
            <TableInlineEditCell
              value={desc}
              textarea
              onSave={async (value) => {
                const trimmed = value.trim();
                if (trimmed === desc) return;
                await updateTechnology(row.id as number, { description: trimmed || null });
                void loadRef.current();
              }}
            />
          );
        },
      },
      color_token: {
        label: 'Color',
        width: '90px',
        sortable: true,
        renderCell: (row: Record<string, unknown>) => (
          <div className="flex items-center gap-1.5">
            <div
              className={[
                'inline-block size-3 rounded-full shrink-0',
                getColorBg(String(row.color_token ?? 'gray')),
              ].join(' ')}
            />
            <Text as="span" size="xs" color="muted">
              {String(row.color_token ?? 'gray')}
            </Text>
          </div>
        ),
      },
      status: {
        label: 'Status',
        width: '70px',
        sortable: false,
        renderCell: (row) => createElement(StatusCell, {
          statusableType: 'technology_catalog',
          statusableId: row['id'] as number,
          currentStatus: row['status'] as string | null | undefined,
          currentColor: row['status_color_token'] as string | null | undefined,
        }),
      },
    }),
    [statusFilter, handleStatusFilterChange],
  );

  // ── Filter handlers ────────────────────────────────────────────────
  const onProviderFilterChange = useCallback(
    (value: string) => {
      setParam(PROVIDER_PARAM, value === 'all' ? '' : value);
      setPage(0);
      void loadRef.current();
    },
    [setParam, setPage],
  );

  const onTypeFilterChange = useCallback(
    (value: string) => {
      setParam(TYPE_PARAM, value === 'all' ? '' : value);
      setPage(0);
      void loadRef.current();
    },
    [setParam, setPage],
  );

  const onIconFilterChange = useCallback((value: string) => {
    setIconFilter(value as 'all' | 'loaded' | 'missing');
    setPage(0);
  }, [setPage]);

  // ── Build table state ──────────────────────────────────────────────
  return {
    columns,
    error,
    loading,
    table: buildTableState({
      data: filteredData,
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
    }),
    providerFilter,
    providerOptions: PROVIDER_OPTIONS,
    onProviderFilterChange,
    typeFilter,
    typeOptions: TYPE_OPTIONS,
    onTypeFilterChange,
    iconFilter,
    onIconFilterChange,
    iconCounts,
  };
}
