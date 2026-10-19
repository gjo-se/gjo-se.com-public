/**
 * Admin LLM endpoints (inline term explanation).
 */
import { api } from '@src/lib/api/axios';

/** Request body for the inline-explain endpoint. */
export interface InlineExplainRequest {
  term: string;
  context: string;
}

/** Response of the inline-explain endpoint. */
export interface InlineExplainResponse {
  explanation: string;
  call_log_id: number | null;
}

/** Calls the inline-explain endpoint to get a KI explanation for a term. */
export async function inlineExplain(data: InlineExplainRequest): Promise<InlineExplainResponse> {
  const res = await api.post<InlineExplainResponse>('/admin/llm/inline-explain', data);
  return res.data;
}
