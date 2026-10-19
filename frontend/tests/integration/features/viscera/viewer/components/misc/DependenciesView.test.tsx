import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DependenciesView } from '@src/features/viscera/viewer/components/misc/DependenciesView';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeDiagram, renderWithWorkspace } from '../../../visceraTestUtils';

import type { Edge } from '@src/features/viscera/core/workspaceSchema';

const EDGES: Edge[] = [
  { from: 'backend', to: 'database', description: 'liest', technology: 'SQL' },
  { from: 'frontend', to: 'backend', description: 'ruft auf' },
];

const DIAGRAMS = [
  makeDiagram({ key: 'backend-context', name: 'Backend', nodes: { backend: { x: 0, y: 0 } } }),
  makeDiagram({ key: 'frontend-context', name: 'Frontend', nodes: { frontend: { x: 0, y: 0 } } }),
];

afterEach(() => {
  useVisceraStore.getState().setViewKey('SystemContext');
});

describe('DependenciesView', () => {
  it('groups outgoing and incoming edges with counts', () => {
    renderWithWorkspace(<DependenciesView objectId="backend" edges={EDGES} diagrams={[]} />);

    expect(screen.getByText('Outgoing (1)')).toBeInTheDocument();
    expect(screen.getByText('Incoming (1)')).toBeInTheDocument();
    expect(screen.getByText('liest')).toBeInTheDocument();
    expect(screen.getByText('ruft auf')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('shows empty hints when the object has no dependencies', () => {
    renderWithWorkspace(<DependenciesView objectId="isolated" edges={EDGES} diagrams={[]} />);

    expect(screen.getByText('No outgoing edges')).toBeInTheDocument();
    expect(screen.getByText('No incoming edges')).toBeInTheDocument();
  });

  it('offers diagram links whose root system contains the edge endpoints', () => {
    renderWithWorkspace(
      <DependenciesView objectId="backend" edges={EDGES} diagrams={DIAGRAMS} />,
    );

    expect(screen.getAllByRole('button', { name: 'backend-context' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'frontend-context' })).toBeInTheDocument();
  });

  it('navigates to the selected diagram', () => {
    renderWithWorkspace(
      <DependenciesView objectId="backend" edges={EDGES} diagrams={DIAGRAMS} />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'backend-context' })[0]!);

    expect(useVisceraStore.getState().viewKey).toBe('backend-context');
  });
});
