import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import YamlEditor from '@src/features/viscera/editor/components/editor/YamlEditor';
import { worker } from '@src/mocks/browser';

import { EMPTY_WORKSPACE, renderWithWorkspace } from '../../../visceraTestUtils';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

const WORKSPACE_WITH_NODES: Workspace = {
  ...EMPTY_WORKSPACE,
  objects: [
    { id: 'backend', name: 'Backend', description: '', external: false },
    { id: 'frontend', name: 'Frontend', description: '', external: false },
  ],
};

describe('YamlEditor', () => {
  it('reports the first file as active and offers all node files', async () => {
    worker.use(
      http.get('/architecture/workspace.yml', () =>
        HttpResponse.text('id: gjo-se\nname: gjo-se.com\ndescription: Test'),
      ),
    );
    const onActiveFileChange = vi.fn();

    renderWithWorkspace(<YamlEditor onActiveFileChange={onActiveFileChange} />, {
      workspace: WORKSPACE_WITH_NODES,
    });

    expect(screen.getByRole('button', { name: 'workspace.yml' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'backend.yml' })).toBeInTheDocument();
    expect(onActiveFileChange).toHaveBeenCalledWith('/architecture/workspace.yml');
  });

  it('reports a file switch through the toolbar', async () => {
    worker.use(
      http.get('/architecture/workspace.yml', () =>
        HttpResponse.text('id: gjo-se\nname: gjo-se.com\ndescription: Test'),
      ),
      http.get('/architecture/nodes/backend.yml', () =>
        HttpResponse.text('id: backend\nname: Backend'),
      ),
    );
    const onActiveFileChange = vi.fn();

    renderWithWorkspace(<YamlEditor onActiveFileChange={onActiveFileChange} />, {
      workspace: WORKSPACE_WITH_NODES,
    });

    fireEvent.click(screen.getByRole('button', { name: 'backend.yml' }));

    expect(onActiveFileChange).toHaveBeenCalledWith('/architecture/nodes/backend.yml');
  });

  it('shows an error when the yaml file cannot be loaded', async () => {
    worker.use(
      http.get('/architecture/workspace.yml', () =>
        HttpResponse.text('boom', { status: 500 }),
      ),
    );

    renderWithWorkspace(<YamlEditor />);

    expect(await screen.findByText(/Fehler beim Laden von \/architecture\/workspace.yml/)).toBeInTheDocument();
  });
});
