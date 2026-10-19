import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GroupDetailsPanel from '@src/features/viscera/viewer/components/panel/GroupDetailsPanel';

import { makeGroup } from '../../../visceraTestUtils';

const MEMBERS = [
  { id: 'backend', name: 'Backend' },
  { id: 'database', name: 'Database' },
];

function renderPanel(overrides: Partial<Parameters<typeof GroupDetailsPanel>[0]> = {}) {
  const props = {
    groupId: 'group-backend',
    group: makeGroup({ id: 'group-backend', name: 'Backend', description: 'Sammelgruppe' }),
    members: MEMBERS,
    onClose: vi.fn(),
    onRename: vi.fn(),
    onDescriptionChange: vi.fn(),
    onRemoveMember: vi.fn(),
    ...overrides,
  };
  render(<GroupDetailsPanel {...props} />);
  return props;
}

describe('GroupDetailsPanel', () => {
  it('shows the group name, member count and members', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.getByText('Members: 2')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('shows an empty hint for a group without members', () => {
    renderPanel({ members: [] });

    expect(screen.getByText('Keine Members')).toBeInTheDocument();
  });

  it('reports a group that does not exist', () => {
    renderPanel({ group: null });

    expect(screen.getByText('Group not found.')).toBeInTheDocument();
  });

  it('renames the group through the inline editor', async () => {
    const view = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Backend' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Backend Team' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() => expect(view.onRename).toHaveBeenCalledWith('Backend Team'));
  });

  it('removes a member via its labelled action', () => {
    const view = renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: 'Database aus Group entfernen' }),
    );

    expect(view.onRemoveMember).toHaveBeenCalledWith('database');
  });
});
