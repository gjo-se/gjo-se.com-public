import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ObjectStoreAssetGrid from '@src/components/organisms/ObjectStorePicker/ObjectStoreAssetGrid';

import type { AssetInfo } from '@src/lib/api/assetTypes';

const assets: AssetInfo[] = [
  { key: 'portfolio/cover.png', name: 'cover.png', createdAt: '2026-10-01T08:00:00Z' },
  { key: 'hero.webp', name: 'hero-source.webp', createdAt: '2026-10-02T08:00:00Z' },
];

function renderGrid(overrides: Partial<React.ComponentProps<typeof ObjectStoreAssetGrid>> = {}) {
  return render(
    <ObjectStoreAssetGrid
      assets={assets}
      value={null}
      highlightKey={null}
      onSelect={vi.fn()}
      onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
      emptyLabel="Keine Assets"
      {...overrides}
    />,
  );
}

describe('ObjectStoreAssetGrid', () => {
  it('renders the empty label without assets', () => {
    renderGrid({ assets: [] });

    expect(screen.getByText('Keine Assets')).toBeVisible();
  });

  it('renders the folder and filename of each asset', () => {
    renderGrid();

    expect(screen.getByText('portfolio/')).toBeVisible();
    expect(screen.getByText('cover.png')).toBeVisible();
    expect(screen.getByText('hero-source.webp')).toBeVisible();
  });

  it('selects the clicked asset', async () => {
    const onSelect = vi.fn();
    renderGrid({ onSelect });

    await userEvent.click(screen.getByText('cover.png'));

    expect(onSelect).toHaveBeenCalledWith('portfolio/cover.png');
  });

  it('deletes an asset only after confirmation', async () => {
    const onConfirmDelete = vi.fn().mockResolvedValue(undefined);
    renderGrid({ onConfirmDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Asset cover.png löschen' }));
    expect(await screen.findByText('Asset löschen')).toBeVisible();
    expect(onConfirmDelete).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Löschen' }).click();

    expect(onConfirmDelete).toHaveBeenCalledWith('portfolio/cover.png');
  });

  it('keeps the asset when the dialog is cancelled', async () => {
    const onConfirmDelete = vi.fn().mockResolvedValue(undefined);
    renderGrid({ onConfirmDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Asset cover.png löschen' }));
    const cancel = await screen.findByRole('button', { name: 'Abbrechen' });
    cancel.click();

    expect(onConfirmDelete).not.toHaveBeenCalled();
  });
});
