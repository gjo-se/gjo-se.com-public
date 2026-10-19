import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { WorkspaceContext } from '../core/useWorkspace';
import { loadWorkspace } from '../services/workspaceLoader';
import { useVisceraStore } from '../store/visceraStore';



import type { WorkspaceContextValue } from '../core/useWorkspace';
import type { Workspace } from '../core/workspaceSchema';

export interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * Provider that loads the workspace from the API and validates against
 * the workspace schema.
 *
 * I/O logic is delegated to `services/workspaceLoader.ts`.
 *
 * The loaded workspace is scoped to the active `navigation.source` from the
 * store: when the world changes (`code` ⇄ `golden`) the workspace is
 * automatically reloaded for that source.
 *
 * Manual reload only — no HMR/file-watcher auto-reload (2026-08-11).
 * External changes (scanner, VS Code edits) require the "⟳ Reload"
 * toolbar button or programmatic `reload()` after scan completion.
 *
 * Exposes `updateWorkspace` so the LivePreview can push live edits
 * into the workspace without re-fetching from the server.
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const source = useVisceraStore((s) => s.source);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadWorkspace(source);
      setWorkspace(result.workspace);
      setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [source]);

  /**
   * Manually reload the workspace from the API.
   *
   * Use for external changes (scanner completion, VS Code edits).
   * Do NOT call from user-operation paths — Zustand already has the
   * latest state after a successful sync queue write.
   */
  const reload = useCallback(async () => {
    setError(null);

    try {
      const result = await loadWorkspace(source);
      setWorkspace(result.workspace);
      setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWorkspace(null);
    }
  }, [source]);

  // Initial load on mount + automatic reload whenever the active source changes.
  useEffect(() => {
    load();
  }, [load]);

  const updateWorkspace = useCallback((ws: Workspace) => {
    setWorkspace(ws);
    setError(null);
  }, []);

  const resetToServer = useCallback(() => {
    reload();
  }, [reload]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspace, error, loading, reload, updateWorkspace, resetToServer }),
    [workspace, error, loading, reload, updateWorkspace, resetToServer],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
