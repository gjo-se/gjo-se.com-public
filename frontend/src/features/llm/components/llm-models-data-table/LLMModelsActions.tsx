import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import Separator from '@src/components/primitives/Separator';

import type { LLMSyncResult } from '../../services/modelCatalogService';

interface Props {
  syncResult: LLMSyncResult | null
  onClearSyncResult: () => void
}

/** Sync result toast for the LLM models table. */
export default function LLMModelsActions({
  syncResult,
  onClearSyncResult,
}: Props) {
  const lastSyncRef = useRef(syncResult);

  useEffect(() => {
    const current = syncResult;
    if (!current || current === lastSyncRef.current) return;
    lastSyncRef.current = current;
    toast.success(
      `Sync abgeschlossen: ${current.providers_upserted} Provider, ${current.models_upserted} Modelle, ${current.snapshots_created} Snapshots.`,
    );
    onClearSyncResult();
  }, [syncResult, onClearSyncResult]);

  return <Separator spacing="mb-4" />;
}
