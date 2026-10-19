import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import ObjectStorePicker from '@src/components/organisms/ObjectStorePicker/ObjectStorePicker';
import { worker } from '@src/mocks/browser';

import type { AssetInfo } from '@src/components/organisms/ObjectStorePicker/ObjectStorePicker.service';

const ASSETS: AssetInfo[] = [
  { key: 'project-a/proof-1.png', name: 'project-a/proof-1.png', createdAt: '' },
  { key: 'project-a/proof-2.webp', name: 'project-a/proof-2.webp', createdAt: '' },
  { key: 'project-b/proof-1.svg', name: 'project-b/proof-1.svg', createdAt: '' },
];

describe('ObjectStorePicker', () => {
  it('renders placeholder in the trigger when no value is selected', () => {
    render(
      <ObjectStorePicker
        value={null}
        onChange={vi.fn()}
        loadAssets={vi.fn(async () => [])}
        placeholder="Asset auswählen…"
      />,
    );

    expect(screen.getByText('Asset auswählen…')).toBeInTheDocument();
  });

  it('renders the current storage key in the trigger when a value is set', () => {
    render(
      <ObjectStorePicker
        value="project-a/proof-2.webp"
        onChange={vi.fn()}
        loadAssets={vi.fn(async () => ASSETS)}
      />,
    );

    expect(screen.getByText('project-a/proof-2.webp')).toBeInTheDocument();
  });

  it('loads and lists assets when the popover is opened, and selection calls onChange', async () => {
    const onChange = vi.fn();
    render(
      <ObjectStorePicker
        value={null}
        onChange={onChange}
        loadAssets={vi.fn(async () => ASSETS)}
        placeholder="Asset auswählen…"
      />,
    );

    fireEvent.click(screen.getByText('Asset auswählen…'));

    await waitFor(() =>
      expect(screen.getByText('proof-1.png')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('proof-1.png'));

    expect(onChange).toHaveBeenCalledWith('project-a/proof-1.png');
  });

  it('shows the empty message when the store has no assets', async () => {
    render(
      <ObjectStorePicker
        value={null}
        onChange={vi.fn()}
        loadAssets={vi.fn(async () => [])}
        placeholder="Asset auswählen…"
      />,
    );

    fireEvent.click(screen.getByText('Asset auswählen…'));

    await waitFor(() =>
      expect(screen.getByText('Keine Assets gefunden.')).toBeInTheDocument(),
    );
  });

  it('shows an error message when loading assets fails', async () => {
    render(
      <ObjectStorePicker
        value={null}
        onChange={vi.fn()}
        loadAssets={vi.fn(async () => {
          throw new Error('boom');
        })}
        placeholder="Asset auswählen…"
      />,
    );

    fireEvent.click(screen.getByText('Asset auswählen…'));

    await waitFor(() =>
      expect(
        screen.getByText('Assets konnten nicht geladen werden.'),
      ).toBeInTheDocument(),
    );
  });

  it('uploads a file, reloads assets and highlights the new key', async () => {
    // I/O boundary fake: the real upload service hits the ObjectStore endpoint.
    worker.use(
      http.post('/api/v1/admin/object-store/assets', () =>
        HttpResponse.json({ key: 'project-a/new-proof.png', webpKey: null }),
      ),
    );
    const loadAssets = vi
      .fn()
      .mockResolvedValueOnce([{ key: 'project-a/proof-1.png', name: 'project-a/proof-1.png', createdAt: '' }])
      .mockResolvedValueOnce([
        { key: 'project-a/proof-1.png', name: 'project-a/proof-1.png', createdAt: '' },
        { key: 'project-a/new-proof.png', name: 'project-a/new-proof.png', createdAt: '' },
      ]);

    render(
      <ObjectStorePicker
        value={null}
        onChange={vi.fn()}
        loadAssets={loadAssets}
        placeholder="Asset auswählen…"
        uploadPrefix="project-a/"
      />,
    );

    fireEvent.click(screen.getByText('Asset auswählen…'));
    await waitFor(() =>
      expect(screen.getByText('proof-1.png')).toBeInTheDocument(),
    );

    // Upload auslösen: File-Input mit einer Datei befüllen
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [new File(['x'], 'new-proof.png', { type: 'image/png' })] },
    });

    // Beobachtbares Ergebnis: Liste neu geladen + neuer Key hervorhebbar
    await waitFor(() =>
      expect(screen.getByText('new-proof.png')).toBeInTheDocument(),
    );
    expect(loadAssets).toHaveBeenCalledTimes(2);
  });
});
