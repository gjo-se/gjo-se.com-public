import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import GroupCreateSection from '@src/features/viscera/viewer/components/overlay/GroupCreateSection';

function renderSection(
  overrides: Partial<Parameters<typeof GroupCreateSection>[0]> = {},
) {
  const props = {
    onCreateGroup: vi.fn().mockResolvedValue({ ok: true }),
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(
    <ReactFlowProvider>
      <GroupCreateSection {...props} />
    </ReactFlowProvider>,
  );
  return props;
}

describe('GroupCreateSection', () => {
  it('expands the inline name input', () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Group' }));

    expect(screen.getByLabelText('Group-Name')).toBeInTheDocument();
  });

  it('creates the group and closes on success', async () => {
    const view = renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Group' }));
    fireEvent.change(screen.getByLabelText('Group-Name'), {
      target: { value: '  Backend Group  ' },
    });
    fireEvent.keyDown(screen.getByLabelText('Group-Name'), { key: 'Enter' });

    await waitFor(() =>
      expect(view.onCreateGroup).toHaveBeenCalledWith(
        'Backend Group',
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      ),
    );
    expect(view.onSuccess).toHaveBeenCalledOnce();
  });

  it('keeps the input open and shows the server error', async () => {
    const view = renderSection({
      onCreateGroup: vi.fn().mockResolvedValue({ ok: false, error: 'Name existiert bereits' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Neue Group' }));
    fireEvent.change(screen.getByLabelText('Group-Name'), { target: { value: 'Backend' } });
    fireEvent.keyDown(screen.getByLabelText('Group-Name'), { key: 'Enter' });

    expect(await screen.findByText('Name existiert bereits')).toBeInTheDocument();
    expect(screen.getByLabelText('Group-Name')).toBeInTheDocument();
    expect(view.onSuccess).not.toHaveBeenCalled();
  });

  it('returns to the menu on Escape without creating a group', () => {
    const view = renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Group' }));
    fireEvent.keyDown(screen.getByLabelText('Group-Name'), { key: 'Escape' });

    expect(screen.queryByLabelText('Group-Name')).toBeNull();
    expect(view.onCreateGroup).not.toHaveBeenCalled();
  });

  it('ignores an empty group name', () => {
    const view = renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Neue Group' }));
    fireEvent.change(screen.getByLabelText('Group-Name'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByLabelText('Group-Name'), { key: 'Enter' });

    expect(view.onCreateGroup).not.toHaveBeenCalled();
  });
});
