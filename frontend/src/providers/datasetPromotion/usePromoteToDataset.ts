import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  promoteToDataset,
  type PromoteToDatasetResponse,
} from '@src/lib/api/callLog';

export interface UsePromoteToDatasetResult {
  promote: (callLogId: number, label: 'golden' | 'failure') => Promise<PromoteToDatasetResponse | null>;
  isPromoting: boolean;
  lastResult: PromoteToDatasetResponse | null;
}

/**
 * Shared hook for Golden/Fehler feedback buttons.
 *
 * Handles client-side validation warnings and API calls. Reusable across
 * CallLogListPage, AIScope footer, and ObserverTicket batch-promote.
 */
export function usePromoteToDataset(): UsePromoteToDatasetResult {
  const [isPromoting, setIsPromoting] = useState(false);
  const [lastResult, setLastResult] = useState<PromoteToDatasetResponse | null>(null);

  const promote = useCallback(
    async (
      callLogId: number,
      label: 'golden' | 'failure',
    ): Promise<PromoteToDatasetResponse | null> => {
      setIsPromoting(true);
      setLastResult(null);
      try {
        const result = await promoteToDataset(callLogId, label);
        setLastResult(result);

        if (result.status === 'created') {
          toast.success(result.message || `Als ${label === 'golden' ? 'Golden' : 'Fehlerfall'} gespeichert.`);
        } else if (result.status === 'duplicate') {
          toast.warning(result.message);
        } else {
          toast.error(result.validation_errors.join('; ') || result.message);
        }
        return result;
      } catch {
        toast.error('Fehler beim Speichern.');
        return null;
      } finally {
        setIsPromoting(false);
      }
    },
    [],
  );

  return { promote, isPromoting, lastResult };
}
