/**
 * useJudgeInfo – fetches the current Judge model from LangFuse (SSOT).
 *
 * Reads from GET /admin/llm/eval-runs/judge-info which queries
 * the LangFuse PostgreSQL for the default LLM model and maps it to
 * our internal llm_model table.
 */
import { useEffect, useState } from 'react';

import { api } from '@src/lib/api/axios';

export interface JudgeInfo {
  provider: string
  model_name: string
  internal_model_id: number | null
  internal_display_name: string | null
  configured: boolean
}

/**
 *
 */
export function useJudgeInfo(): {
  judgeInfo: JudgeInfo | null
  loading: boolean
  error: string | null
} {
  const [judgeInfo, setJudgeInfo] = useState<JudgeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<JudgeInfo>('/admin/llm/eval-runs/judge-info')
      .then((res) => {
        if (!cancelled) setJudgeInfo(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { judgeInfo, loading, error };
}
