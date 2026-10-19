import { createContext, useContext } from 'react';

import type { Workspace } from './workspaceSchema';

export interface UseWorkspaceResult {
  /** Single workspace (workspace.yml). Default for all consumers. */
  workspace: Workspace | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  /** Replace the current workspace (used by LivePreview for live edits). */
  updateWorkspace: (ws: Workspace) => void;
}

export interface WorkspaceContextValue extends UseWorkspaceResult {
  /** Reset to server-fetched data, discarding any manual updateWorkspace overrides. */
  resetToServer: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Hook that provides shared workspace state via WorkspaceContext. */
export function useWorkspace(): UseWorkspaceResult {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a <WorkspaceProvider>');
  }
  return ctx;
}
