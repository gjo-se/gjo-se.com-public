import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LivePreview from '@src/features/viscera/editor/components/editor/LivePreview';

import { EMPTY_WORKSPACE, createWorkspaceValue, renderWithWorkspace } from '../../../visceraTestUtils';

describe('LivePreview', () => {
  it('shows a parse error for invalid yaml', async () => {
    renderWithWorkspace(
      <LivePreview activeFilePath="/architecture/workspace.yml" yamlText={'name: [unclosed'} />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/YAML Parse Error/);
  });

  it('pushes a valid workspace edit into the shared context', async () => {
    const updateWorkspace = vi.fn();
    renderWithWorkspace(
      <LivePreview
        activeFilePath="/architecture/workspace.yml"
        yamlText={'name: Neu\nid: gjo-se\ndescription: Beschreibung'}
      />,
      {
        value: {
          ...createWorkspaceValue(EMPTY_WORKSPACE),
          updateWorkspace,
        },
      },
    );

    await waitFor(() => expect(updateWorkspace).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the canvas quiet for an empty editor value', () => {
    renderWithWorkspace(
      <LivePreview activeFilePath="/architecture/workspace.yml" yamlText="" />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
