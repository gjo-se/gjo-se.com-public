import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Breadcrumb from '@src/features/viscera/viewer/components/misc/Breadcrumb';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeDiagram, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

afterEach(() => {
  useVisceraStore.getState().setViewKey('SystemContext');
});

describe('Breadcrumb', () => {
  it('shows only the SystemContext root in the landscape view', () => {
    renderWithWorkspace(<Breadcrumb />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getAllByText('SystemContext').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows SystemContext > system name for a level-2 view', () => {
    useVisceraStore.getState().setViewKey('backend');

    renderWithWorkspace(<Breadcrumb systemName="Backend System" />);

    expect(screen.getByRole('button', { name: 'SystemContext' })).toBeInTheDocument();
    expect(screen.getByText('Backend System')).toBeInTheDocument();
  });

  it('derives the view name from the workspace when no explicit name is given', () => {
    useVisceraStore.getState().setViewKey('system-context');

    renderWithWorkspace(
      <Breadcrumb
        workspace={makeWorkspace({
          diagrams: [makeDiagram({ key: 'system-context', name: 'Mein System' })],
        })}
      />,
      {
        workspace: makeWorkspace({
          diagrams: [makeDiagram({ key: 'system-context', name: 'Mein System' })],
        }),
      },
    );

    expect(screen.getByText('Mein System')).toBeInTheDocument();
  });

  it('navigates back to the SystemContext root', () => {
    useVisceraStore.getState().setViewKey('backend');

    renderWithWorkspace(<Breadcrumb systemName="Backend System" />);
    fireEvent.click(screen.getByRole('button', { name: 'SystemContext' }));

    expect(useVisceraStore.getState().viewKey).toBe('SystemContext');
  });

  it('renders the module chain as four levels', () => {
    useVisceraStore.getState().setViewKey('backend.api');

    renderWithWorkspace(<Breadcrumb moduleDiagramName="API Module" />);

    expect(screen.getByText('API Module')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});
