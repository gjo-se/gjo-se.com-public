import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ImageSrcCell from '@src/features/portfolio/components/proof-sub-table/ImageSrcCell';

const ASSET_KEY = 'portfolio/fixture.webp';

describe('ImageSrcCell', () => {
  it('renders a dash when no image path is set', () => {
    render(<ImageSrcCell src={null} onSave={vi.fn()} />);

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('renders the storage key when a path is set', async () => {
    render(<ImageSrcCell src={ASSET_KEY} onSave={vi.fn()} />);

    expect(await screen.findByText(ASSET_KEY)).toBeInTheDocument();
  });

  it('saves the edited path on Enter', async () => {
    const onSave = vi.fn();
    render(<ImageSrcCell src={ASSET_KEY} onSave={onSave} />);

    await userEvent.click(await screen.findByText(ASSET_KEY));
    const input = await screen.findByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'neu/bild.webp');
    await userEvent.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledWith('neu/bild.webp');
  });

  it('cancels the edit on Escape without saving', async () => {
    const onSave = vi.fn();
    render(<ImageSrcCell src={ASSET_KEY} onSave={onSave} />);

    await userEvent.click(await screen.findByText(ASSET_KEY));
    const input = await screen.findByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'verworfen.webp');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText(ASSET_KEY)).toBeInTheDocument();
  });
});
