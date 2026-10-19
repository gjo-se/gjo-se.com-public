/**
 * useLLMModelsTable – Server-side data-loading hook for LLM models table.
 *
 * Uses useServerSideTable for pagination, sorting, filtering.
 * Filters are declared as `filter` properties on column definitions and rendered
 * automatically by the Table compound component in its TableToolbar.
 *
 * Pattern: follows Aiscope's useAdminProjects – filter change handlers call
 * setParam + setPage(0) + loadRef.current(...) with explicit values to trigger
 * immediate data reload without waiting for React state sync.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';

import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { routeConfig } from '@src/router.config';

import { fetchModelCount, fetchModels } from '../services/modelCatalogService';
import {
  MODELS_EXTRA_PARAMS,
  SORT_FIELD_MAP,
  TABLE_KEY,
  parseBoolDropdown,
} from '../utils/llmModelsTableParams';

import { useLLMModels } from './useLLMModels';
import { useLLMModelsColumns } from './useLLMModelsColumns';

import type { LLMModelEntry, LLMSyncResult } from '../services/modelCatalogService';

/** One formatted row of the LLM models table. */
export interface LLMModelTableRow {
  id: number
  displayName: string
  inText: string
  inImage: string
  inFile: string
  inAudio: string
  inVideo: string
  sepInOut: string
  outText: string
  outImage: string
  outFile: string
  outAudio: string
  outVideo: string
  sepOutSo: string
  priceRange: string
  supportsStructuredOutput: string
  reasoning: string
  priceInput: string
  active: boolean
  status: string | null
  status_color_token: string | null
  originalModel: LLMModelEntry
}

/** Snapshot of the active server-side filter values. */
interface ModelFilters {
  supportsStructuredOutput: boolean | null
  reasoning: boolean | null
  isActive: boolean | null
  inputModality: string | null
  outputModality: string | null
  priceMin: number | null
  priceMax: number | null
}

/** Result contract for the LLM models table. */
export interface UseLLMModelsTableResult {
  table: TableStateProps<LLMModelTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<LLMModelTableRow>[]
  loading: boolean
  error: string | null
  syncResult: LLMSyncResult | null
  clearSyncResult: () => void
}

/** Maps raw API models to formatted table rows. */
function formatModels(models: LLMModelEntry[]): LLMModelTableRow[] {
  return models.map((m) => {
    const arch = (m.architecture as Record<string, unknown>) || {};
    const params = Array.isArray(m.supported_parameters) ? m.supported_parameters as string[] : [];
    const inputs = Array.isArray(arch.input_modalities) ? (arch.input_modalities as string[]) : [];
    const outputs = Array.isArray(arch.output_modalities) ? (arch.output_modalities as string[]) : [];
    return {
      id: m.id,
      displayName: m.display_name,
      inText: yn(inputs.includes('text')),
      inImage: yn(inputs.includes('image')),
      inFile: yn(inputs.includes('file')),
      inAudio: yn(inputs.includes('audio')),
      inVideo: yn(inputs.includes('video')),
      outText: yn(outputs.includes('text')),
      outImage: yn(outputs.includes('image')),
      outFile: yn(outputs.includes('file')),
      outAudio: yn(outputs.includes('audio')),
      outVideo: yn(outputs.includes('video')),
      sepInOut: '',
      sepOutSo: '',
      priceRange: '',
      supportsStructuredOutput: yn(params.includes('structured_outputs')),
      reasoning: yn(m.reasoning != null),
      priceInput: m.current_price_input ? `$${Number(m.current_price_input).toFixed(2)}` : '\u2013',
      active: m.active,
      status: m.status,
      status_color_token: m.status_color_token,
      originalModel: m,
    };
  });
}

/** Server-side table hook for the LLM models table. */
export function useLLMModelsTable(): UseLLMModelsTableResult {
  const loadRef = useRef<((searchQ: string, filters: ModelFilters) => Promise<void>) | null>(null);

  const {
    data: rawData, total, loading, error,
    q, page, size, sort, order, tableKey, params,
    setQ, setPage, setSize, setSort, setParam,
    handleSearchChange, resetUrlState,
    executeLoad,
    defaultSort,
  } = useServerSideTable<LLMModelEntry>({
    tableKey: TABLE_KEY,
    defaultSort: 'display_name',
    defaultOrder: 'asc',
    extraParams: MODELS_EXTRA_PARAMS,
    onSearch: (value) => {
      void loadRef.current?.(value, currentFilters());
    },
    onLoad: () => {
      void loadRef.current?.(q, currentFilters());
    },
  });

  const {
    handleToggleActive: doToggleActive,
    syncResult,
    clearSyncResult: doClearSyncResult,
  } = useLLMModels();

  // ── Filter refs (kept current via useEffect, like Aiscope's *FilterRef pattern) ──
  const supportsStructuredOutputRef = useRef<boolean | null>(
    params.supports_structured_output as boolean | null ?? null,
  );
  const reasoningRef = useRef<boolean | null>(params.reasoning as boolean | null ?? null);
  const isActiveRef = useRef<boolean | null>(params.is_active as boolean | null ?? null);
  const inputModalityRef = useRef<string | null>((params.input_modality as string) ?? null);
  const outputModalityRef = useRef<string | null>((params.output_modality as string) ?? null);
  const priceMinRef = useRef<number | null>((params.price_min as number) ?? null);
  const priceMaxRef = useRef<number | null>((params.price_max as number) ?? null);

  useEffect(() => {
    supportsStructuredOutputRef.current = params.supports_structured_output as boolean | null ?? null;
  });
  useEffect(() => { reasoningRef.current = params.reasoning as boolean | null ?? null; });
  useEffect(() => { isActiveRef.current = params.is_active as boolean | null ?? null; });
  useEffect(() => { inputModalityRef.current = (params.input_modality as string) ?? null; });
  useEffect(() => { outputModalityRef.current = (params.output_modality as string) ?? null; });
  useEffect(() => { priceMinRef.current = (params.price_min as number) ?? null; });
  useEffect(() => { priceMaxRef.current = (params.price_max as number) ?? null; });

  /** Snapshot current filters from refs (used by load and callbacks). */
  const currentFilters = useCallback((): ModelFilters => ({
    supportsStructuredOutput: supportsStructuredOutputRef.current,
    reasoning: reasoningRef.current,
    isActive: isActiveRef.current,
    inputModality: inputModalityRef.current,
    outputModality: outputModalityRef.current,
    priceMin: priceMinRef.current,
    priceMax: priceMaxRef.current,
  }), []);

  // ── Load function (takes explicit filter values, like Aiscope's `load`) ──
  const load = useCallback(
    async (searchQ: string, filters: ModelFilters) => {
      await executeLoad(async () => {
        const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
        const listParams: Record<string, string> = {};
        if (searchQ) listParams.q = searchQ;
        if (filters.supportsStructuredOutput != null) {
          listParams.supports_structured_output = String(filters.supportsStructuredOutput);
        }
        if (filters.reasoning != null) listParams.reasoning = String(filters.reasoning);
        if (filters.isActive != null) listParams.is_active = String(filters.isActive);
        if (filters.inputModality) listParams.input_modality = filters.inputModality;
        if (filters.outputModality) listParams.output_modality = filters.outputModality;
        if (filters.priceMin != null) listParams.price_min = String(filters.priceMin);
        if (filters.priceMax != null) listParams.price_max = String(filters.priceMax);
        if (backendSort) listParams.sort_by = backendSort;
        if (order) listParams.sort_order = order;
        listParams.offset = String(page * size);
        listParams.limit = String(size);

        const [data, totalCount] = await Promise.all([
          fetchModels(listParams as Parameters<typeof fetchModels>[0]),
          fetchModelCount(listParams as Parameters<typeof fetchModelCount>[0]),
        ]);
        return { data, total: totalCount };
      });
    },
    [executeLoad, sort, order, page, size, defaultSort],
  );

  useLayoutEffect(() => { loadRef.current = load; });

  // Reload when extra params change (Reset button, URL back/forward).
  // Only watches extra params – q/page/sort reloads are handled by useServerSideTable.
  const prevExtraRef = useRef(JSON.stringify([
    params.supports_structured_output,
    params.reasoning,
    params.is_active,
    params.input_modality,
    params.output_modality,
  ]));
  useEffect(() => {
    const key = JSON.stringify([
      params.supports_structured_output,
      params.reasoning,
      params.is_active,
      params.input_modality,
      params.output_modality,
      params.price_min,
      params.price_max,
    ]);
    if (prevExtraRef.current === key) return;
    prevExtraRef.current = key;
    setPage(0);
    void loadRef.current?.(q, currentFilters());
  }, [
    params.supports_structured_output,
    params.reasoning,
    params.is_active,
    params.input_modality,
    params.output_modality,
    params.price_min,
    params.price_max,
    q,
    setPage,
    currentFilters,
  ]);

  // ── Filter change handlers (pattern: setParam + setPage(0) + loadRef.current with explicit values) ──

  const handleSupportsStructuredOutputChange = useCallback(
    (value: string) => {
      const parsed = parseBoolDropdown(value);
      supportsStructuredOutputRef.current = parsed;
      setParam('supports_structured_output', parsed);
      setPage(0);
      void loadRef.current?.(q, { ...currentFilters(), supportsStructuredOutput: parsed });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handleReasoningChange = useCallback(
    (value: string) => {
      const parsed = parseBoolDropdown(value);
      reasoningRef.current = parsed;
      setParam('reasoning', parsed);
      setPage(0);
      void loadRef.current?.(q, { ...currentFilters(), reasoning: parsed });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handleIsActiveChange = useCallback(
    (value: string) => {
      const parsed = parseBoolDropdown(value);
      isActiveRef.current = parsed;
      setParam('is_active', parsed);
      setPage(0);
      void loadRef.current?.(q, { ...currentFilters(), isActive: parsed });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handleInputModalityChange = useCallback(
    (value: string | null) => {
      inputModalityRef.current = value;
      setParam('input_modality', value);
      setPage(0);
      void loadRef.current?.(q, {
        ...currentFilters(),
        inputModality: value,
      });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handleOutputModalityChange = useCallback(
    (value: string | null) => {
      outputModalityRef.current = value;
      setParam('output_modality', value);
      setPage(0);
      void loadRef.current?.(q, {
        ...currentFilters(),
        outputModality: value,
      });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handlePriceMinChange = useCallback(
    (value: number | null) => {
      priceMinRef.current = value;
      setParam('price_min', value);
      setPage(0);
      void loadRef.current?.(q, { ...currentFilters(), priceMin: value });
    },
    [q, setParam, setPage, currentFilters],
  );

  const handlePriceMaxChange = useCallback(
    (value: number | null) => {
      priceMaxRef.current = value;
      setParam('price_max', value);
      setPage(0);
      void loadRef.current?.(q, { ...currentFilters(), priceMax: value });
    },
    [q, setParam, setPage, currentFilters],
  );

  // ── Columns (filter factories use the change handlers) ────
  const columns = useLLMModelsColumns({
    params,
    onInputModalityChange: handleInputModalityChange,
    onOutputModalityChange: handleOutputModalityChange,
    onSupportsStructuredOutputChange: handleSupportsStructuredOutputChange,
    onReasoningChange: handleReasoningChange,
    onIsActiveChange: handleIsActiveChange,
    onPriceMinChange: handlePriceMinChange,
    onPriceMaxChange: handlePriceMaxChange,
  });

  // ── Data formatting ────────────────────────────────────────────────────
  const data = useMemo(() => formatModels(rawData), [rawData]);

  // ── Row actions (toggle active + detail navigation) ────────────────────
  const navigate = useNavigate();
  const handleToggle = useCallback(
    async (row: LLMModelTableRow) => {
      await doToggleActive(row.originalModel);
      await load(q, currentFilters());
    },
    [doToggleActive, load, q, currentFilters],
  );

  const handleEdit = useCallback(
    async (row: LLMModelTableRow) => {
      const from = `${window.location.pathname}${window.location.search}`;
      navigate(`${routeConfig.adminLlmModelDetail.path}/${row.originalModel.id}`, { state: { from } });
    },
    [navigate],
  );

  const rowActions = useTableActions<LLMModelTableRow>({
    onToggle: handleToggle,
    onEdit: handleEdit,
  });

  return {
    table: buildTableState({
      data, total, q, page, size,
      sort, order, tableKey,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    loading,
    error,
    syncResult,
    clearSyncResult: doClearSyncResult,
  };
}

function yn(v: boolean) { return v ? '+' : '\u2013'; }
