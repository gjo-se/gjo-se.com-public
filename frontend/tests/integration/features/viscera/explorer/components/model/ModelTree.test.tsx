import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ModelTree from '@src/features/viscera/explorer/components/model/ModelTree';

import { renderWithWorkspace } from '../../../visceraTestUtils';

import type { ModelObject } from '@src/features/viscera/explorer/hooks/useModelExplorer';

const SYSTEM: ModelObject = {
  id: 'backend',
  name: 'Backend',
  type: 'system',
  parentId: undefined,
  childrenCount: 1,
  edgesCount: 2,
  diagramsCount: 1,
  status: 'active',
};

const CONTAINER: ModelObject = {
  id: 'backend.api',
  name: 'API',
  type: 'container',
  parentId: 'backend',
  childrenCount: 0,
  edgesCount: 0,
  diagramsCount: 1,
};

describe('ModelTree', () => {
  it('shows an empty hint when no objects exist', () => {
    renderWithWorkspace(<ModelTree objects={[]} />);

    expect(screen.getByText('No objects to display.')).toBeInTheDocument();
  });

  it('renders top-level rows with counts and total', () => {
    renderWithWorkspace(<ModelTree objects={[SYSTEM]} />);

    expect(screen.getByRole('button', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.getByText('Total objects: 1')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('expands a system and reveals its children', () => {
    renderWithWorkspace(<ModelTree objects={[SYSTEM, CONTAINER]} />);

    expect(screen.queryByRole('button', { name: 'API' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

    expect(screen.getByRole('button', { name: 'API' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
  });

  it('reports the clicked object id', () => {
    const onObjectClick = vi.fn();
    renderWithWorkspace(<ModelTree objects={[SYSTEM]} onObjectClick={onObjectClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Backend' }));

    expect(onObjectClick).toHaveBeenCalledWith('backend');
  });
});
