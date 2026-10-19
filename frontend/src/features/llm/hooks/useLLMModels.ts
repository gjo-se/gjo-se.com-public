/**
 * useLLMModels – Hook for model toggle, sync result management, and model list.
 *
 * The server-side table (useLLMModelsTable) handles pagination/sorting/filtering.
 * This hook provides the full model list for comboboxes (use-case mapping) and the
 * toggle-active / sync-result actions shared across llm features.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchModels, patchLLMModelActive } from '../services/modelCatalogService';

import type { LLMModelEntry, LLMSyncResult } from '../services/modelCatalogService';

interface UseLLMModelsReturn {
  models: LLMModelEntry[]
  loading: boolean
  error: string | null
  syncResult: LLMSyncResult | null
  handleToggleActive: (model: LLMModelEntry) => Promise<void>
  clearSyncResult: () => void
}

/**
 *
 */
export function useLLMModels(): UseLLMModelsReturn {
  const [models, setModels] = useState<LLMModelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<LLMSyncResult | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchModels({ limit: 500 });
        setModels(data);
      } catch {
        // models are optional for the toggle/sync use-case
      }
    })();
  }, []);

  const handleToggleActive = useCallback(async (model: LLMModelEntry) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patchLLMModelActive(model.id, !model.active);
      setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      setError('Fehler beim Aktualisieren des Modells.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSyncResult = () => setSyncResult(null);

  return {
    models,
    loading,
    error,
    syncResult,
    handleToggleActive,
    clearSyncResult,
  };
}
