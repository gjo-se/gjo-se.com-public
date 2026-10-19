import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TagAssignCell from '@src/features/fbf/skill/components/tag-assign/TagAssignCell';

describe('TagAssignCell', () => {
  it('loads the current assignments and shows the empty picker', async () => {
    render(<TagAssignCell skillId={1} />);

    expect(await screen.findByText('Tags suchen...')).toBeInTheDocument();
  });

  it('assigns a tag and notifies the parent', async () => {
    const onTagsChanged = vi.fn();
    render(<TagAssignCell skillId={1} onTagsChanged={onTagsChanged} />);

    await userEvent.click(await screen.findByText('Tags suchen...'));
    (await screen.findByText('Backend')).click();

    await vi.waitFor(() => {
      expect(onTagsChanged).toHaveBeenCalled();
    });
  });

  it('renders the picker for a skill without tags', async () => {
    render(<TagAssignCell skillId={2} />);

    expect(await screen.findByText('Tags suchen...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /entfernen/ })).not.toBeInTheDocument();
  });
});
