/**
 * useTaskModelConfigs – Data-loading hook for the unified model config table.
 *
 * Loads all model configs for a task, provides columns (with inlineEdit +
 * ghostRow support) and row actions (toggle active, delete).
 *
 * Pattern: exact mirror of useAdminLLMCredentials – same Table compound
 * component, same optimistic-update flow, same Ghost Row (Cmd+Enter).
 *
 * Hyperparameter fields (temperature, max_tokens, top_p, reasoning) are extracted
 * from the ``hyperparameters`` JSON column and merged back on save.
 *
 * Abhängigkeit: #977 (BE /model-config/* Endpunkte).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import Chip from '@src/components/primitives/Chip/Chip';
import Link from '@src/components/primitives/Link';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useTableActions } from '@src/components/table/useTableActions';
import { useTableUrlState } from '@src/components/table/useTableUrlState';
import { api } from '@src/lib/api/axios';
import { showErrorToast } from '@src/lib/errorToast';
import { withAsyncState } from '@src/lib/withAsyncState';
import { routeConfig } from '@src/router.config';

import { useCircuitBreakerStatus } from '../hooks/useCircuitBreakerStatus';
import { useLLMModels } from '../hooks/useLLMModels';
import {
  createModelConfig,
  deleteModelConfig,
  fetchModelConfigs,
  updateModelConfig,
  type ModelConfigCreate,
  type ModelConfigRow,
  type ModelConfigUpdate,
} from '../services/modelConfigService';
import ReasoningCombobox from '../shared/ReasoningCombobox';
import {
  EM_DASH,
  STANDARD_HP_KEYS,
  TABLE_KEY_BASE,
  excludeStandardParams,
  extractErrorMessage,
  extractParam,
  getBreakerVariant,
  mergeHyperparameters,
} from '../utils/modelConfigHelpers';

import { useTaskModelConfigColumns } from './useTaskModelConfigColumns';

import type { CircuitBreakerStatus } from '../services/circuitBreakerService';
import type { ReactNode } from 'react';

/** LLM credential option used by the provider combobox. */
interface CredentialOption {
  id: number
  service: string
  source_type: string
  portal: string | null
  provider: string | null
  label: string | null
  active: boolean
}

/** One row of the unified model config table. */
export interface ModelConfigTableRow {
  id: number
  providerDisplay: string
  providerSort: string
  modelDisplay: ReactNode
  modelSort: string
  modelId: number
  temperature: string
  maxTokens: string
  topP: string
  reasoning: ReactNode
  reasoningSort: string
  advancedJson: string
  isProduction: boolean
  isFallback: boolean
  status: string | null
  status_color_token: string | null
  breakerState: ReactNode
  breakerSort: string
  config: ModelConfigRow
}

/** Result contract for the unified model config table. */
export interface UseTaskModelConfigsResult {
  table: TableStateProps<ModelConfigTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<ModelConfigTableRow>[]
  loading: boolean
  error: string | null
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>
  allConfigs: ModelConfigRow[]
}

/**
 * Loads model configs for a task and wires the Table compound component.
 *
 * Ghost row (Cmd+Enter) allows creating new configs with model selection
 * and hyperparameter overrides. Inline-edits on temperature / max_tokens /
 * top_p persist optimistically via PATCH.
 */
export function useTaskModelConfigs(
  taskKey: string | undefined,
): UseTaskModelConfigsResult {
  const tableKey = `${TABLE_KEY_BASE}${taskKey ?? 'unknown'}`;
  const {
    q, page, size, sort, order, setQ, setPage, setSize, setSort, resetUrlState,
  } = useTableUrlState(tableKey);

  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
    setPage(0);
  }, [setQ, setPage]);

  const [allConfigs, setAllConfigs] = useState<ModelConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reuse the existing LLM models hook (same data as old TaskMappingSection).
  const { models: allModels } = useLLMModels();

  // Credentials for provider combobox (same pattern as old TaskMappingSection).
  const [providers, setProviders] = useState<CredentialOption[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<CredentialOption[]>('/admin/credentials');
        setProviders(res.data.filter((c) => c.source_type === 'llm' && c.active));
      } catch { /* credentials optional */ }
    })();
  }, []);

  /** Format provider label like ListView: "portal · provider · label". */
  const providerLabel = useCallback((c: CredentialOption) => {
    const parts = [c.portal, c.provider, c.label].filter((p): p is string => Boolean(p));
    return parts.length > 0 ? parts.join(' \u00b7 ') : c.service;
  }, []);

  // Provider combobox options for ghost row.
  const providerOptions: DropdownItem[] = useMemo(
    () => providers.map((p) => ({ value: String(p.id), label: providerLabel(p) })),
    [providers, providerLabel],
  );

  // Build provider display from credential data (matches ListView format).
  const getProviderDisplay = useCallback(
    (credentialId: number | null) => {
      if (credentialId == null) return EM_DASH;
      const p = providers.find((c) => c.id === credentialId);
      return p ? providerLabel(p) : EM_DASH;
    },
    [providers, providerLabel],
  );

  // Circuit breaker status per provider_key (e.g. "direct") – maps to credential.portal.
  const { breakers } = useCircuitBreakerStatus();
  const breakerByProvider = useMemo(
    () => new Map(breakers.map((b) => [b.provider_key, b])),
    [breakers],
  );

  /** Get circuit breaker state for a credential, resolved by credential.portal. */
  const getBreakerState = useCallback(
    (credentialId: number | null): CircuitBreakerStatus | null => {
      if (credentialId == null) return null;
      const cred = providers.find((c) => c.id === credentialId);
      const key = cred?.portal ?? cred?.provider;
      return key ? (breakerByProvider.get(key) ?? null) : null;
    },
    [providers, breakerByProvider],
  );

  // Combobox options for ghost row – same as old TaskMappingSection.
  const modelOptions: DropdownItem[] = useMemo(
    () =>
      allModels
        .filter((m) => m.active)
        .map((m) => ({
          value: String(m.id),
          label: m.display_name,
        })),
    [allModels],
  );

  const getModelDefaults = useCallback(
    (modelId: number): Record<string, unknown> | null =>
      allModels.find((m) => m.id === modelId)?.default_parameters ?? null,
    [allModels],
  );

  // ── Load data ──────────────────────────────────────────────────────────
  const loadRef = useRef(async () => {
    if (!taskKey) return;
    const configs = await withAsyncState(setLoading, setError, () =>
      fetchModelConfigs(taskKey),
    );
    if (configs) setAllConfigs(configs);
  });


  useEffect(() => { void loadRef.current(); }, [taskKey]);

  const reload = useCallback(async () => {
    if (!taskKey) return;
    const configs = await withAsyncState(setLoading, setError, () =>
      fetchModelConfigs(taskKey),
    );
    if (configs) setAllConfigs(configs);
  }, [taskKey]);

  // ── Inline-edit (hyperparameter fields): optimistic → API → toast+reload ─
  const handleHyperparameterEdit = useCallback(async (
    rowId: number,
    field: string,
    value: string,
  ) => {
    const row = allConfigs.find((c) => c.id === rowId);
    if (!row) return;

    const merged = mergeHyperparameters(row.hyperparameters, field, value);

    // Optimistic local update.
    setAllConfigs((prev) =>
      prev.map((c) =>
        c.id === rowId ? { ...c, hyperparameters: merged } : c,
      ),
    );
    try {
      await updateModelConfig(rowId, {
        hyperparameters: merged,
      } as ModelConfigUpdate);
    } catch (err: unknown) {
      showErrorToast(extractErrorMessage(err, 'Fehler beim Speichern.'));
      await reload();
    }
  }, [allConfigs, reload]);

  /** Replaces the advanced JSON field (exotic params only). Preserves inline-managed params. */
  const handleAdvancedJsonEdit = useCallback(async (
    rowId: number,
    json: string,
  ) => {
    const row = allConfigs.find((c) => c.id === rowId);
    if (!row) return;

    const existing = (row.hyperparameters ?? {}) as Record<string, unknown>;

    // Empty / cleared → strip exotic params, keep inline-managed standard params.
    if (!json || json === '{}') {
      const standardOnly: Record<string, unknown> = {};
      STANDARD_HP_KEYS.forEach((key) => {
        if (existing[key] != null) standardOnly[key] = existing[key];
      });
      const result = Object.keys(standardOnly).length > 0 ? standardOnly : null;
      setAllConfigs((prev) =>
        prev.map((c) => (c.id === rowId ? { ...c, hyperparameters: result } : c)),
      );
      try {
        await updateModelConfig(rowId, { hyperparameters: result } as ModelConfigUpdate);
      } catch (err: unknown) {
        showErrorToast(extractErrorMessage(err, 'Fehler beim Speichern.'));
        await reload();
      }
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      return; // invalid JSON – silently ignored
    }

    // Preserve inline-edited standard fields unless explicitly overridden in JSON.
    const merged = { ...parsed };
    STANDARD_HP_KEYS.forEach((key) => {
      if (existing[key] != null && parsed[key] == null) merged[key] = existing[key];
    });

    setAllConfigs((prev) =>
      prev.map((c) => (c.id === rowId ? { ...c, hyperparameters: merged } : c)),
    );
    try {
      await updateModelConfig(rowId, {
        hyperparameters: Object.keys(merged).length > 0 ? merged : null,
      } as ModelConfigUpdate);
    } catch (err: unknown) {
      showErrorToast(extractErrorMessage(err, 'Fehler beim Speichern.'));
      await reload();
    }
  }, [allConfigs, reload]);

  // ── Build rows ─────────────────────────────────────────────────────────
  const data: ModelConfigTableRow[] = useMemo(
    () =>
      allConfigs.map((config) => {
        const defaults = getModelDefaults(config.model_id);
        const modelLabel = config.model_display_name ?? EM_DASH;
        const breaker = getBreakerState(config.credential_id);
        return {
          id: config.id,
          providerDisplay: getProviderDisplay(config.credential_id),
          providerSort: getProviderDisplay(config.credential_id),
          modelDisplay: (
            <Link
              to={routeConfig.adminLlmModelDetail.path.replace(':id', String(config.model_id))}
              variant="muted"
              size="sm"
            >
              {modelLabel}
            </Link>
          ),
          modelSort: modelLabel,
          modelId: config.model_id,
          temperature: extractParam(config.hyperparameters, 'temperature', defaults),
          maxTokens: extractParam(config.hyperparameters, 'max_tokens', defaults),
          topP: extractParam(config.hyperparameters, 'top_p', defaults),
          reasoning: (
            <ReasoningCombobox
              value={extractParam(config.hyperparameters, 'reasoning', defaults) || 'off'}
              configId={config.id}
              onSave={handleHyperparameterEdit}
            />
          ),
          reasoningSort: extractParam(config.hyperparameters, 'reasoning', defaults) || 'off',
          advancedJson: config.hyperparameters
            ? (() => {
                const exotic = excludeStandardParams(config.hyperparameters);
                return exotic ? JSON.stringify(exotic) : '';
              })()
            : '',
          isProduction: config.is_production,
          isFallback: config.is_fallback,
          status: config.status,
          status_color_token: config.status_color_token,
          breakerState: breaker ? (
            <Chip variant={getBreakerVariant(breaker.state)}>{breaker.state}</Chip>
          ) : null,
          breakerSort: breaker?.state ?? '',
          config,
        };
      }),
    [allConfigs, getModelDefaults, getProviderDisplay, getBreakerState, handleHyperparameterEdit],
  );

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useTaskModelConfigColumns({
    providerOptions,
    modelOptions,
    onHyperparameterEdit: handleHyperparameterEdit,
    onAdvancedJsonEdit: handleAdvancedJsonEdit,
  });


  // ── Ghost Row create ───────────────────────────────────────────────────
  const onGhostCreate = useCallback(
    async (data: Record<string, unknown>): Promise<unknown> => {
      if (!taskKey) throw new Error('Kein Task ausgewählt.');

      const modelId = Number(data.modelDisplay);
      if (!modelId || Number.isNaN(modelId)) {
        throw new Error('Modell ist erforderlich.');
      }

      const credentialId = data.providerDisplay
        ? Number(data.providerDisplay)
        : undefined;

      const hp: Record<string, unknown> = {};
      const tempVal = String(data.temperature ?? '').trim();
      const mtVal = String(data.maxTokens ?? '').trim();
      const tpVal = String(data.topP ?? '').trim();
      const reasonVal = String(data.reasoning ?? '').trim();
      if (tempVal) hp.temperature = Number(tempVal);
      if (mtVal) hp.max_tokens = Number(mtVal);
      if (tpVal) hp.top_p = Number(tpVal);
      if (reasonVal && reasonVal !== 'off') hp.reasoning = reasonVal;

      // Merge advanced JSON (exotic parameters).
      const advancedJson = String(data.advancedJson ?? '').trim();
      if (advancedJson) {
        try {
          const parsed = JSON.parse(advancedJson) as Record<string, unknown>;
          Object.assign(hp, parsed);
        } catch { /* invalid JSON – ignored */ }
      }

      const payload: ModelConfigCreate = {
        model_id: modelId,
        credential_id: credentialId,
        hyperparameters: Object.keys(hp).length > 0 ? hp : null,
      };

      await createModelConfig(taskKey, payload);
      await reload();
      return { modelId };
    },
    [taskKey, reload],
  );

  // ── Row actions ──────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (row: ModelConfigTableRow) => {
      try {
        await deleteModelConfig(row.config.id);
        await reload();
      } catch { /* ignore */ }
    },
    [reload],
  );

  /** Single role action: cycles none → production → fallback → none. */
  const handleSetRole = useCallback(
    async (row: ModelConfigTableRow) => {
      if (row.isProduction) {
        // Currently production → unset (back to none).
        await updateModelConfig(row.config.id, {
          is_production: false,
        } as ModelConfigUpdate);
      } else if (row.isFallback) {
        // Currently fallback → unset.
        await updateModelConfig(row.config.id, {
          is_fallback: false,
        } as ModelConfigUpdate);
      } else {
        // Currently none → set production (skip if taken by another row).
        const otherProduction = allConfigs.some(
          (c) => c.id !== row.config.id && c.is_production,
        );
        if (!otherProduction) {
          await updateModelConfig(row.config.id, {
            is_production: true,
            is_fallback: false,
          } as ModelConfigUpdate);
        } else {
          // Production taken → try fallback.
          const otherFallback = allConfigs.some(
            (c) => c.id !== row.config.id && c.is_fallback,
          );
          if (!otherFallback) {
            await updateModelConfig(row.config.id, {
              is_fallback: true,
              is_production: false,
            } as ModelConfigUpdate);
          }
          // If both taken: no-op (icon stays none).
        }
      }
      await reload();
    },
    [reload, allConfigs],
  );

  const rowActions = useTableActions<ModelConfigTableRow>({
    onDelete: handleDelete,
    deleteDisabled: (row) => row.isProduction,
    deleteDisabledTitle: 'Production-Modell kann nicht gelöscht werden',
  });

  /** Single icon slot for role: – | ⭐ | 🛡️ */
  const rowActionsWithRoles: TableRowActionsProps<ModelConfigTableRow>[] = useMemo(
    () => [
      {
        key: 'setRole',
        icon: (row: ModelConfigTableRow) => {
          if (row.isProduction) return 'star';
          if (row.isFallback) return 'shield-check';
          return 'minus';
        },
        label: 'Rolle',
        onAction: async (row) => { await handleSetRole(row); },
        disabled: (row) => row.status === 'inactive',
        disabledTitle: 'Nur für aktive Modelle',
        filled: (row) => row.isProduction || row.isFallback,
      },
      ...rowActions,
    ],
    [rowActions, handleSetRole],
  );

  return {
    table: buildTableState({
      data, total: data.length, q, page, size,
      sort, order, tableKey,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions: rowActionsWithRoles,
    loading,
    error,
    onGhostCreate,
    allConfigs,
  };
}
