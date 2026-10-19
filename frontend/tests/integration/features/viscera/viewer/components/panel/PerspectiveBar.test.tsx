import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PerspectiveBar from '@src/features/viscera/viewer/components/panel/PerspectiveBar';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeObject, makeWorkspace, renderWithWorkspace } from '../../../visceraTestUtils';

const WORKSPACE = makeWorkspace({
  objects: [
    makeObject({
      id: 'backend',
      name: 'Backend',
      type: 'container',
      tags: ['backend'],
      status: 'active',
      technologies: ['typescript'],
    }),
  ],
});

afterEach(() => {
  useVisceraStore.getState().resetAll();
  useVisceraStore.setState({ panelCollapsed: false });
});

describe('PerspectiveBar', () => {
  it('renders one badge row per entity type from the workspace', async () => {
    renderWithWorkspace(<PerspectiveBar workspace={WORKSPACE} />);

    expect(await screen.findByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('toggles a badge from neutral to focus', async () => {
    renderWithWorkspace(<PerspectiveBar workspace={WORKSPACE} />);

    const badge = await screen.findByRole('button', { name: /tag domain: Backend, neutral/ });
    fireEvent.click(badge);

    expect(
      screen.getByRole('button', { name: /tag domain: Backend, focus, aktiv/ }),
    ).toBeInTheDocument();
  });

  it('offers a reset once a filter is active', async () => {
    renderWithWorkspace(<PerspectiveBar workspace={WORKSPACE} />);

    fireEvent.click(await screen.findByRole('button', { name: /status.*, neutral/ }));

    const reset = screen.getByRole('button', { name: /Reset all \(1\)/ });
    fireEvent.click(reset);

    expect(
      screen.getByRole('button', { name: /status.*, neutral/ }),
    ).toBeInTheDocument();
  });

  it('collapses and expands the badge rows', async () => {
    renderWithWorkspace(<PerspectiveBar workspace={WORKSPACE} />);

    const collapse = await screen.findByRole('button', { name: 'Collapse filter bar' });
    fireEvent.click(collapse);

    expect(screen.getByRole('button', { name: 'Expand filter bar' })).toBeInTheDocument();
  });
});
