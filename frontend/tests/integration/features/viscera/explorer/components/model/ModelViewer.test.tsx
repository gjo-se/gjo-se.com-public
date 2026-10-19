import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ModelViewer from '@src/features/viscera/explorer/components/model/ModelViewer';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { EdgeLine, NormalizedModelObject } from '@src/features/viscera/explorer/utils/modelViewerTypes';

const SYSTEM: NormalizedModelObject = {
  id: 'backend',
  name: 'Backend',
  type: 'system',
  edgesCount: 1,
  hasChildren: true,
  technologies: ['typescript'],
};

const CONTAINER: NormalizedModelObject = {
  id: 'backend.api',
  name: 'API',
  type: 'container',
  parentId: 'backend',
  edgesCount: 0,
  hasChildren: false,
};

const EDGES: EdgeLine[] = [{ from: 'backend', to: 'backend.api' }];

function viewerProps() {
  return {
    edges: EDGES,
    selectedObjectId: null,
    hoveredObjectId: null,
    onObjectClick: vi.fn(),
    onObjectHover: vi.fn(),
    onEdgeClick: vi.fn(),
    onToggleExpand: vi.fn(),
    expandedIds: new Set<string>(),
  };
}

describe('ModelViewer', () => {
  it('renders the top-level cards', () => {
    renderWithWorkspace(<ModelViewer objects={[SYSTEM, CONTAINER]} {...viewerProps()} />);

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.queryByText('API')).not.toBeInTheDocument();
    expect(screen.getByText('1 edges')).toBeInTheDocument();
  });

  it('reveals children of expanded objects', () => {
    renderWithWorkspace(
      <ModelViewer
        objects={[SYSTEM, CONTAINER]}
        {...viewerProps()}
        expandedIds={new Set(['backend'])}
      />,
    );

    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Container')).toBeInTheDocument();
  });

  it('reports clicks and expansion through the public props', () => {
    const props = viewerProps();
    renderWithWorkspace(<ModelViewer objects={[SYSTEM, CONTAINER]} {...props} />);

    fireEvent.click(screen.getByText('Backend'));
    expect(props.onObjectClick).toHaveBeenCalledWith('backend');

    fireEvent.click(screen.getByTitle('Expand'));
    expect(props.onToggleExpand).toHaveBeenCalledWith('backend');
  });

  it('resolves the technology name from the catalog', async () => {
    renderWithWorkspace(<ModelViewer objects={[SYSTEM]} {...viewerProps()} />);

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
  });
});
