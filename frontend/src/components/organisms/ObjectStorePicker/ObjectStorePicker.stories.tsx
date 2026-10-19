import { expect, fn, userEvent } from 'storybook/test';

import ObjectStorePicker from './ObjectStorePicker';

import type { AssetInfo } from './ObjectStorePicker.service';
import type { Meta, StoryObj } from '@storybook/react-vite';

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockAssets: AssetInfo[] = [
  { key: 'project-a/proof-1.png', name: 'project-a/proof-1.png', createdAt: '' },
  { key: 'project-a/proof-2.webp', name: 'project-a/proof-2.webp', createdAt: '' },
  { key: 'project-b/proof-1.svg', name: 'project-b/proof-1.svg', createdAt: '' },
  { key: 'project-c/hero.svg', name: 'project-c/hero.svg', createdAt: '' },
];

const loadAssetsMock = fn(async () => mockAssets);
const onSelectMock = fn();
const loadEmptyMock = fn(async () => [] as AssetInfo[]);
const loadErrorMock = fn(async () => {
  throw new Error('boom');
});

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'organisms/ObjectStorePicker',
  component: ObjectStorePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof ObjectStorePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ──────────────────────────────────────────────────────────────────

/** Ohne Auswahl – öffnet das Popover, listet Assets, Auswahl ruft onChange auf. */
export const Default: Story = {
  args: {
    value: null,
    onChange: onSelectMock,
    loadAssets: loadAssetsMock,
    placeholder: 'Asset auswählen…',
  },
  play: async ({ canvas }) => {
    // Öffnen des Popovers über den Placeholder-Trigger
    await userEvent.click(await canvas.findByText('Asset auswählen…'));

    // Assets werden geladen und angezeigt (Dateiname, Ordner-Breadcrumb davor)
    await expect(await canvas.findByText('proof-1.png')).toBeDefined();
    await expect(canvas.getByText('proof-1.svg')).toBeDefined();

    // Auswahl ruft onChange mit dem Key auf
    await userEvent.click(canvas.getByText('proof-1.png'));
    await expect(onSelectMock).toHaveBeenCalledWith('project-a/proof-1.png');
  },
};

/** Mit vorhandener Auswahl – zeigt den aktuellen Key im Trigger. */
export const WithSelection: Story = {
  args: {
    value: 'project-a/proof-2.webp',
    onChange: onSelectMock,
    loadAssets: loadAssetsMock,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('project-a/proof-2.webp')).toBeDefined();
  },
};

/** Leerer Store – zeigt die Empty-Message. */
export const Empty: Story = {
  args: {
    value: null,
    onChange: onSelectMock,
    loadAssets: loadEmptyMock,
    placeholder: 'Asset auswählen…',
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText('Asset auswählen…'));
    await expect(await canvas.findByText('Keine Assets gefunden.')).toBeDefined();
  },
};

/** Laden fehlgeschlagen – zeigt eine Fehlermeldung. */
export const LoadError: Story = {
  args: {
    value: null,
    onChange: onSelectMock,
    loadAssets: loadErrorMock,
    placeholder: 'Asset auswählen…',
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText('Asset auswählen…'));
    await expect(
      await canvas.findByText('Assets konnten nicht geladen werden.'),
    ).toBeDefined();
  },
};

/** Kontext-Prefix – filtert standardmäßig auf den Ordner, Dropdown zum Wechseln. */
export const FolderFiltered: Story = {
  args: {
    value: null,
    onChange: onSelectMock,
    loadAssets: loadAssetsMock,
    placeholder: 'Asset auswählen…',
    prefix: 'project-a',
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText('Asset auswählen…'));

    // Default-Filter: nur Assets unter project-a/
    await expect(await canvas.findByText('proof-1.png')).toBeDefined();
    await expect(canvas.getByText('proof-2.webp')).toBeDefined();
    await expect(canvas.queryByText('proof-1.svg')).toBeNull();

    // Dropdown ist sichtbar (mehrere Ordner) – auf "Alle Ordner" wechseln
    await expect(await canvas.findByRole('combobox', { name: 'Ordner' })).toBeDefined();
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Ordner' }), 'all');
    await expect(await canvas.findByText('proof-1.svg')).toBeDefined();
  },
};
