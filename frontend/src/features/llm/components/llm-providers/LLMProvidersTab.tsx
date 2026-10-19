import Table from '@src/components/table';
import type { LLMProviderAdmin } from '@src/lib/api/llmProviders';

import { useLLMProviders } from '../../hooks/useLLMProviders';
import LLMProvidersActions from '../llm-providers-data-table/LLMProvidersActions';


/** Tab wrapping the LLM providers Table compound component with sync action. */
export default function LLMProvidersTab() {
  const { table, columns, syncing, handleSync } = useLLMProviders();

  return (
    <>
      <LLMProvidersActions syncing={syncing} onSync={handleSync} />

      <Table<LLMProviderAdmin>
        table={table}
        columns={columns}
      />
    </>
  );
}
