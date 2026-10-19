import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import DetailDiagramViewer from '@src/features/viscera/viewer/components/misc/DetailDiagramViewer';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { worker } from '@src/mocks/browser';

import { makeObject, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

const CONTAINER = makeObject({
  id: 'backend',
  name: 'Backend API',
  type: 'container',
  description: 'Die FastAPI-Anwendung.',
  technologies: ['fastapi'],
  tags: ['backend'],
});

const WORKSPACE = makeWorkspace({ objects: [CONTAINER] });

afterEach(() => {
  useVisceraStore.getState().setDetailContainer(null);
});

function renderDetail(workspace = WORKSPACE) {
  useVisceraStore.getState().setDetailContainer('backend');
  return renderWithWorkspace(<DetailDiagramViewer />, { workspace });
}

describe('DetailDiagramViewer', () => {
  it('falls back to the info panel when the container has no rendered diagram', () => {
    renderDetail();

    expect(screen.getAllByText('Backend API').length).toBeGreaterThan(0);
    expect(screen.getByText('Die FastAPI-Anwendung.')).toBeInTheDocument();
    expect(screen.getByText('Description (LLM-ready)')).toBeInTheDocument();
  });

  it('closes the detail view via the back button', () => {
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: '← Zurück' }));

    expect(useVisceraStore.getState().detailContainerId).toBeNull();
  });

  it('reports a container that does not exist in the workspace', () => {
    useVisceraStore.getState().setDetailContainer('missing');
    renderWithWorkspace(<DetailDiagramViewer />, { workspace: WORKSPACE });

    expect(screen.getByText(/Container "missing" not found/)).toBeInTheDocument();
  });

  it('loads and embeds the rendered SVG through the HTTP edge', async () => {
    worker.use(
      http.get('/architecture/diagrams/rendered/backend-diagram', () =>
        HttpResponse.text('<svg data-testid="rendered-detail"><text>Rendered</text></svg>'),
      ),
    );
    useVisceraStore.getState().setDetailContainer('backend');
    const { container } = renderWithWorkspace(<DetailDiagramViewer />, {
      workspace: makeWorkspace({
        objects: [{ ...CONTAINER, d2: 'backend-diagram' }],
      }),
    });

    await waitFor(() =>
      expect(container.querySelector('[data-testid="rendered-detail"]')).not.toBeNull(),
    );
  });

  it('shows the load error when the rendered diagram cannot be fetched', async () => {
    worker.use(
      http.get('/architecture/diagrams/rendered/broken-diagram', () =>
        HttpResponse.text('boom', { status: 500 }),
      ),
    );
    useVisceraStore.getState().setDetailContainer('backend');
    renderWithWorkspace(<DetailDiagramViewer />, {
      workspace: makeWorkspace({ objects: [{ ...CONTAINER, d2: 'broken-diagram' }] }),
    });

    expect(
      await screen.findByText(/Failed to load diagram: HTTP 500/),
    ).toBeInTheDocument();
  });
});
