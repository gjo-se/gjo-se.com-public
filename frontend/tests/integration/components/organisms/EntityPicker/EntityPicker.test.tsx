import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import EntityPicker from '@src/components/organisms/EntityPicker/EntityPicker';

import type { EntityOption } from '@src/components/organisms/EntityPicker/EntityPicker.types';

const options: EntityOption[] = [
  { slug: 'backend', name: 'Backend', colorToken: 'blue', category: 'domain' },
  { slug: 'frontend', name: 'Frontend', colorToken: 'green', category: 'domain' },
  { slug: 'docker', name: 'Docker', colorToken: 'gray', category: 'tooling' },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof EntityPicker>> = {}) {
  return render(
    <EntityPicker
      entityType="tag"
      selectionMode="multi"
      options={options}
      selectedKeys={[]}
      onKeysChange={vi.fn()}
      {...overrides}
    />,
  );
}

describe('EntityPicker', () => {
  it('shows the placeholder while nothing is selected', () => {
    renderPicker({ placeholder: 'Tags wählen…' });

    expect(screen.getByText('Tags wählen…')).toBeVisible();
  });

  it('opens the grouped option list', async () => {
    renderPicker();

    await userEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('domain')).toBeVisible();
    expect(screen.getByText('Backend')).toBeVisible();
  });

  it('adds the clicked option in multi-select mode', async () => {
    const onKeysChange = vi.fn();
    renderPicker({ onKeysChange, selectedKeys: ['backend'] });

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    screen.getByText('Docker').click();

    expect(onKeysChange).toHaveBeenCalledWith(['backend', 'docker']);
  });

  it('replaces the selection in single-select mode', async () => {
    const onKeysChange = vi.fn();
    renderPicker({
      selectionMode: 'single',
      entityType: 'status',
      grouped: false,
      onKeysChange,
      selectedKeys: ['backend'],
    });

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    screen.getByText('Frontend').click();

    expect(onKeysChange).toHaveBeenCalledWith(['frontend']);
  });

  it('removes a selected entity through its chip control', async () => {
    const onKeysChange = vi.fn();
    renderPicker({ onKeysChange, selectedKeys: ['backend'] });

    await userEvent.click(screen.getByRole('button', { name: /Backend entfernen/ }));

    expect(onKeysChange).toHaveBeenCalledWith([]);
  });

  it('filters the options by the typed search term', async () => {
    renderPicker();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByPlaceholderText('Tags suchen...'), 'dock');

    expect(await screen.findByText('Docker')).toBeVisible();
    expect(screen.queryByText('Backend')).not.toBeInTheDocument();
  });

  it('creates a new tag inline and selects it', async () => {
    const onCreate = vi.fn().mockResolvedValue('new-tag');
    const onKeysChange = vi.fn();
    renderPicker({ onCreate, onKeysChange, showCreate: true });

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(await screen.findByRole('button', { name: /Neuen Tag erstellen/ }));
    await userEvent.fill(screen.getByPlaceholderText('Name'), 'Neuer Tag');
    await userEvent.click(screen.getByRole('button', { name: /Erstellen/ }));

    expect(onCreate).toHaveBeenCalledWith('Neuer Tag', expect.any(String), expect.any(String));
    expect(onKeysChange).toHaveBeenCalledWith(['new-tag']);
  });
});
