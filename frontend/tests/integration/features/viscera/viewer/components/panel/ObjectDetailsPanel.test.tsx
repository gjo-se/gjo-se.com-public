import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ObjectDetailsPanel } from '@src/features/viscera/viewer/components/panel/ObjectDetailsPanel';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import {
  makeObject,
  makeWorkspace,
  renderWithWorkspace,
} from '../../../visceraTestUtils';

const WORKSPACE = makeWorkspace({
  objects: [makeObject({ id: 'backend', name: 'Backend', type: 'container' })],
  edges: [
    { from: 'backend', to: 'database', description: 'liest', technology: 'SQL' },
  ],
});

afterEach(() => {
  useVisceraStore.getState().setObjectId(null);
  useVisceraStore.getState().setObjectTab('details');
});

function renderPanel() {
  return renderWithWorkspace(
    <ObjectDetailsPanel objectId="backend" onClose={vi.fn()} />,
    { workspace: WORKSPACE },
  );
}

describe('ObjectDetailsPanel', () => {
  it('shows the object header, type badge and details tab', () => {
    renderPanel();

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByText('Backend').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Container').length).toBeGreaterThan(0);
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  it('switches to the edges tab on user interaction', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edges' }));

    expect(screen.getByText('liest')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('switches to the annotations tab', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Annotations' }));

    expect(screen.getByText('Keine Annotationen vorhanden')).toBeInTheDocument();
  });

  it('returns to the details tab after switching tabs', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edges' }));
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });
});
