import Table from '@src/components/table';

import { useLLMModelsTable } from '../../hooks/useLLMModelsTable';
import LLMModelsActions from '../llm-models-data-table/LLMModelsActions';

import type { LLMModelTableRow } from '../../hooks/useLLMModelsTable';

/** Tab wrapping the LLM models Table compound component with sync toast. */
export default function LLMModelsTab() {
  const result = useLLMModelsTable();
  const {
    table, columns, rowActions,
    syncResult, clearSyncResult,
  } = result;

  return (
    <div className="space-y-4">
      <LLMModelsActions
        syncResult={syncResult}
        onClearSyncResult={clearSyncResult}
      />

      <Table<LLMModelTableRow>
        table={table}
        columns={columns}
        rowActions={rowActions}
      />
    </div>
  );
}
