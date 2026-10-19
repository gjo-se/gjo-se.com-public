import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TagPicker from '@src/components/organisms/TagPicker/TagPicker';

describe('TagPicker', () => {
  it('loads the available tags and shows them on open', async () => {
    render(<TagPicker selectedTagIds={[]} onTagsChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Backend')).toBeVisible();
  });

  it('shows the selected tags as chips', async () => {
    render(<TagPicker selectedTagIds={[1]} onTagsChange={vi.fn()} />);

    expect(await screen.findByText(/Backend/)).toBeVisible();
  });

  it('reports the selected tag id after toggling an option', async () => {
    const onTagsChange = vi.fn();
    render(<TagPicker selectedTagIds={[]} onTagsChange={onTagsChange} />);

    await userEvent.click(screen.getByRole('button'));
    screen.getByText('Backend').click();

    expect(onTagsChange).toHaveBeenCalledWith([1]);
  });

  it('reports an empty selection after removing the last tag', async () => {
    const onTagsChange = vi.fn();
    render(<TagPicker selectedTagIds={[1]} onTagsChange={onTagsChange} />);

    await userEvent.click(await screen.findByRole('button', { name: /Backend entfernen/ }));

    expect(onTagsChange).toHaveBeenCalledWith([]);
  });
});
