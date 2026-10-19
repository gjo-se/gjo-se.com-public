/**
 * useLLMProviders – Data-loading hook for LLM providers table.
 *
 * Client-side: loads all providers once, returns data and columns for the
 * Table compound component. The Table handles search, sort, pagination.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { TableColumnProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useClientTableState } from '@src/components/table/useClientTableState';
import {
  fetchAdminLLMProviders,
  updateProviderApiBase,
  type LLMProviderAdmin,
} from '@src/lib/api/llmProviders';
import { withAsyncState } from '@src/lib/withAsyncState';

import {
  type LLMSyncResult,
  syncLLMModels,
} from '../services/modelCatalogService';

// ── Columns ──────────────────────────────────────────────────────────────

const providerColumns: Record<string, TableColumnProps> = {
  name: { label: 'Slug (intern)', width: '160px', search: true, defaultSort: 'asc' },
  display_name: { label: 'Anzeigename', width: '200px', search: true },
  api_base: {
    label: 'API Base URL',
    width: '340px',
    search: true,
    inlineEdit: true,
    onInlineEdit: (row, value) => {
      const r = row as unknown as LLMProviderAdmin;
      void updateProviderApiBase(r.id, value.trim());
    },
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseLLMProvidersResult {
  table: TableStateProps<LLMProviderAdmin>
  columns: Record<string, TableColumnProps>
  loading: boolean
  error: string | null
  syncResult: LLMSyncResult | null
  syncing: boolean
  handleSync: () => Promise<void>
}

const TABLE_KEY = 'llm-providers';

/** Loads LLM providers client-side for the Table compound component. */
export function useLLMProviders(): UseLLMProvidersResult {
  const {
    q,
    page,
    size,
    sort,
    order,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
  } = useClientTableState(TABLE_KEY);

  const [data, setData] = useState<LLMProviderAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<LLMSyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const providers = await withAsyncState(setLoading, setError, async () => {
      const all = await fetchAdminLLMProviders();
      return all.filter((p) => !p.name.startsWith('~'));
    });
    if (providers) setData(providers);
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void (async () => { await load(); })();
  }, [load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncLLMModels();
      setSyncResult(result);
      await load();
    } catch { /* ignore */ }
    setSyncing(false);
  }, [load]);

  return {
    table: buildTableState({
      data, total: data.length, q, page, size,
      sort, order, tableKey: TABLE_KEY,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns: providerColumns,
    loading,
    error,
    syncResult,
    syncing,
    handleSync,
  };
}
