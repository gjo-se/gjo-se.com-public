/** HTTP client for endcustomer candidate and pipeline-test endpoints. */

import { api } from '@src/lib/api/axios';

// ── Pipeline Test Types ──────────────────────────────────────────────────────

export interface ConfirmResult {
  company_id: number;
  person_id: number;
  slave_id: number;
}

export interface EndcustomerCandidate {
  id: number;
  project_id: number;
  company_name: string;
  website: string | null;
  career_page_url: string | null;
  confidence: number | null;
  source: string;
  career_page_description: string | null;
  similarity_to_project: number | null;
  reasoning: string | null;
  status: string | null;
  status_color_token: string | null;
  created_at: string;
}

export interface PipelineActResult {
  act: number;
  name: string;
  status: 'done' | 'failed' | 'skipped';
  duration_ms: number | null;
  summary: string;
  data: Record<string, unknown>;
  call_log_id: number | null;
  error: string | null;
}

// ── Candidate Types ──────────────────────────────────────────────────────────

export interface PipelineResultResponse {
  project_id: number;
  phase: string;
  stopped_at_act: number | null;
  acts: Record<string, PipelineActResult>;
  candidates_fused: number | null;
}

/** Fetch the structured pipeline result for a completed workflow. */
export async function getPipelineResult(taskId: string): Promise<PipelineResultResponse> {
  const res = await api.get<PipelineResultResponse>(`/admin/tasks/${taskId}/pipeline-result`);
  return res.data;
}

/** Fetch all endcustomer candidates for a project. */
export async function getProjectEndcustomerCandidates(projectId: number): Promise<EndcustomerCandidate[]> {
  const res = await api.get<EndcustomerCandidate[]>(
    `/admin/fbf/projects/${projectId}/endcustomer-candidates`,
  );
  return res.data;
}

/** Confirm a candidate as the definitive endcustomer. */
export async function postConfirmCandidate(candidateId: number): Promise<ConfirmResult> {
  const res = await api.post<ConfirmResult>(
    `/admin/fbf/endcustomer-candidates/${candidateId}/confirm`,
  );
  return res.data;
}

/** Reject a candidate. */
export async function postRejectCandidate(candidateId: number): Promise<void> {
  await api.post(`/admin/fbf/endcustomer-candidates/${candidateId}/reject`);
}
