import { api } from '@src/lib/api/axios';

// ── Types ───────────────────────────────────────────────────

export interface EvalTriggerResponse {
  message: string;
  task: string;
  trigger: string;
}

export interface GateResult {
  gate: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  score: number;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface LlmEvalRun {
  id: number;
  task: string;
  model_config_id: number | null;
  trigger: string;
  gate_results: GateResult[] | null;
  overall_status: 'passed' | 'failed' | 'blocked' | 'running';
  reviewer: string | null;
  created_at: string;
}

// ── API functions ───────────────────────────────────────────

const tasksBase = '/admin/llm/tasks';
const evalRunsBase = '/admin/llm/eval-runs';

/**
 *
 */
export async function fetchEvalRuns(
  taskKey: string,
): Promise<LlmEvalRun[]> {
  const res = await api.get<LlmEvalRun[]>(
    `${evalRunsBase}/${taskKey}`,
  );
  return res.data;
}

/**
 *
 */
export async function fetchLatestEval(
  taskKey: string,
): Promise<LlmEvalRun | null> {
  try {
    const res = await api.get<LlmEvalRun>(
      `${tasksBase}/${taskKey}/eval/latest`,
    );
    return res.data;
  } catch {
    return null;
  }
}

/**
 *
 */
export async function fetchLatestEvalBatch(
  taskKey: string,
): Promise<LlmEvalRun[]> {
  try {
    const res = await api.get<LlmEvalRun[]>(
      `${tasksBase}/${taskKey}/eval/latest-batch`,
    );
    return res.data;
  } catch {
    return [];
  }
}

/**
 *
 */
export async function triggerEval(
  taskKey: string,
  trigger = 'manual',
): Promise<EvalTriggerResponse> {
  const res = await api.post<EvalTriggerResponse>(
    `${tasksBase}/${taskKey}/eval`,
    { trigger },
  );
  return res.data;
}
