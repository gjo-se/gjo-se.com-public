import { api } from '@src/lib/api/axios';

export interface NodeSummaryResult {
  description: string | null;
  skipped: boolean;
  reason?: string;
}

/**
 * Generates an on-demand LLM summary for a single derived L3/L4 node.
 *
 * Calls ``POST /api/v1/admin/viscera/nodes/{nodeId}/summary`` (read-only, no
 * file write). An LLM failure is a graceful skip (``skipped: true``) — the
 * caller shows a toast instead of an error.
 */
export async function generateNodeSummary(nodeId: string): Promise<NodeSummaryResult> {
  const { data } = await api.post<NodeSummaryResult>(`/admin/viscera/nodes/${nodeId}/summary`);
  return {
    description: data.description ?? null,
    skipped: Boolean(data.skipped),
    ...(data.reason ? { reason: data.reason } : {}),
  };
}
