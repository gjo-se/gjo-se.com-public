import { useCallback, useEffect, useState } from 'react';

import { api } from '@src/lib/api/axios';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommitInfo {
  hash: string;
  date: string;
  author: string;
  message: string;
  changed_fields: string[];
}

export interface UseGitHistoryResult {
  commits: CommitInfo[];
  loading: boolean;
  error: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that fetches git commit history for a specific object in a YAML file.
 *
 * Calls ``GET /api/v1/git/history?file={file}&object={objectId}`` and returns
 * a list of commits with date, author, message, and changed fields.
 *
 * @param objectId – The dot-separated object ID (e.g. ``"backend"`` or ``"backend.fastapi"``).
 * @param file – Relative file path under architecture/ (e.g. ``"workspace.yml"``).
 */
export function useGitHistory(objectId: string | null, file: string): UseGitHistoryResult {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!objectId) {
      setCommits([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{ commits: CommitInfo[] }>('/git/history', {
        params: { file, object: objectId },
      });
      setCommits(response.data.commits);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  }, [objectId, file]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { commits, loading, error };
}
