import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { WorkspaceProvider } from '@src/features/viscera/shared/WorkspaceProvider';
import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import { worker } from '@src/mocks/browser';

import { renderWithWorkspace } from '../visceraTestUtils';

const WORKSPACE_YML = ['id: gjo-se', 'name: gjo-se.com', 'description: Test-Workspace'].join('\n');

function WorkspaceProbe() {
  const { workspace, error, loading } = useWorkspace();

  if (loading) return <p>loading</p>;
  if (error) return <p>error: {error}</p>;
  return <p>workspace: {workspace?.name}</p>;
}

describe('WorkspaceProvider', () => {
  it('loads the workspace and exposes it to consumers', async () => {
    worker.use(http.get('/architecture/workspace.yml', () => HttpResponse.text(WORKSPACE_YML)));

    renderWithWorkspace(
      <WorkspaceProvider>
        <WorkspaceProbe />
      </WorkspaceProvider>,
    );

    expect(await screen.findByText('workspace: gjo-se.com')).toBeInTheDocument();
  });

  it('exposes a load error to consumers', async () => {
    worker.use(
      http.get('/architecture/workspace.yml', () => HttpResponse.text(WORKSPACE_YML)),
      http.get('/api/v1/admin/viscera/nodes', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    renderWithWorkspace(
      <WorkspaceProvider>
        <WorkspaceProbe />
      </WorkspaceProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText(/error: HTTP 500/)).toBeInTheDocument(),
    );
  });
});
