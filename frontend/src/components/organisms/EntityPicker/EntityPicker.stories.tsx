import { expect, fn, userEvent } from 'storybook/test';

import EntityPicker from './EntityPicker';

import type { EntityOption } from './EntityPicker.types';
import type { Meta, StoryObj } from '@storybook/react-vite';

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockTagOptions: EntityOption[] = [
  { slug: 'risk-high', name: 'High Risk', colorToken: 'red', category: 'Risk', sortOrder: 1 },
  { slug: 'risk-low', name: 'Low Risk', colorToken: 'green', category: 'Risk', sortOrder: 2 },
  { slug: 'deploy-cloud', name: 'Cloud Deployment', colorToken: 'blue', category: 'Deployment', sortOrder: 3 },
  { slug: 'deploy-onprem', name: 'On-Premise', colorToken: 'amber', category: 'Deployment', sortOrder: 4 },
  { slug: 'general-docs', name: 'Documentation', colorToken: 'gray', category: 'General', sortOrder: 5 },
  { slug: 'general-access', name: 'Access Control', colorToken: 'sky', category: 'General', sortOrder: 6 },
];

const mockStatusOptions: EntityOption[] = [
  { slug: 'approved', name: 'Approved', colorToken: 'green' },
  { slug: 'pending', name: 'Pending', colorToken: 'amber' },
  { slug: 'deprecated', name: 'Deprecated', colorToken: 'red' },
  { slug: 'rejected', name: 'Rejected', colorToken: 'gray' },
  { slug: 'in-review', name: 'In Review', colorToken: 'blue' },
];

const mockTechOptions: EntityOption[] = [
  { slug: 'fastapi', name: 'FastAPI', colorToken: 'blue', type: 'framework' },
  { slug: 'postgresql', name: 'PostgreSQL', colorToken: 'teal', type: 'database' },
  { slug: 'redis', name: 'Redis', colorToken: 'red', type: 'cache' },
  { slug: 'react', name: 'React', colorToken: 'cyan', type: 'framework' },
  { slug: 'docker', name: 'Docker', colorToken: 'violet', type: 'infrastructure' },
  { slug: 'typescript', name: 'TypeScript', colorToken: 'blue', type: 'language' },
];

// ── Shared callbacks ─────────────────────────────────────────────────────────

const noopKeysChange = fn();
const createMock = fn(async (name: string, category?: string) => {
  return `${category ?? 'general'}-${name.toLowerCase().replace(/\s+/g, '-')}`;
});
const searchMock = fn(async (query: string) => {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return mockTechOptions.filter(
    (opt) => opt.name.toLowerCase().includes(q) || opt.slug.toLowerCase().includes(q),
  );
});

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'organisms/EntityPicker',
  component: EntityPicker,
  tags: ['autodocs'],
} satisfies Meta<typeof EntityPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ──────────────────────────────────────────────────────────────────

/** Tags: Multi-Select, gruppiert nach Category, mit Inline-Create. */
export const TagMultiGrouped: Story = {
  args: {
    entityType: 'tag',
    selectionMode: 'multi',
    options: mockTagOptions,
    selectedKeys: ['risk-high'],
    onKeysChange: noopKeysChange,
    grouped: true,
    showCreate: true,
    onCreate: createMock,
    placeholder: 'Tags auswählen...',
  },
  play: async ({ canvas }) => {
    // Assert preselected tag is visible in the trigger
    await expect(canvas.getByText('High Risk')).toBeDefined();

    // Click the trigger to open the popover
    const trigger = canvas.getByText('High Risk').closest('[class*="flex min-h-9"]');
    if (trigger) await userEvent.click(trigger);

    // Assert grouped categories are visible in the popover
    await expect(canvas.getByText('Risk')).toBeDefined();
    await expect(canvas.getByText('Deployment')).toBeDefined();
  },
};

/** Status: Single-Select, flache Liste ohne Gruppierung. */
export const StatusSingleFlat: Story = {
  args: {
    entityType: 'status',
    selectionMode: 'single',
    options: mockStatusOptions,
    selectedKeys: ['approved'],
    onKeysChange: noopKeysChange,
    grouped: false,
    placeholder: 'Status auswählen...',
  },
  play: async ({ canvas }) => {
    // Assert preselected status is visible in the trigger
    await expect(canvas.getByText('Approved')).toBeDefined();

    // Click the trigger to open the popover
    const trigger = canvas.getByText('Approved').closest('[class*="flex min-h-9"]');
    if (trigger) await userEvent.click(trigger);

    // Assert flat option list (no category headers)
    await expect(canvas.getByText('Pending')).toBeDefined();
    await expect(canvas.getByText('Deprecated')).toBeDefined();
  },
};

/** Technology: Multi-Select, leere Startliste, Typeahead-Suche via onSearch. */
export const TechMultiTypeahead: Story = {
  args: {
    entityType: 'technology',
    selectionMode: 'multi',
    options: [mockTechOptions.find((o) => o.slug === 'fastapi')!],
    selectedKeys: ['fastapi'],
    onKeysChange: noopKeysChange,
    onSearch: searchMock,
    placeholder: 'Technologien auswählen...',
  },
  play: async ({ canvas }) => {
    // Assert preselected technology is visible in the trigger
    await expect(canvas.getByText('FastAPI')).toBeDefined();

    // Click the trigger to open the popover
    const trigger = canvas.getByText('FastAPI').closest('[class*="flex min-h-9"]');
    if (trigger) await userEvent.click(trigger);

    // Assert empty state message (typeahead, no search entered)
    await expect(canvas.getByText('Mindestens 2 Zeichen eingeben')).toBeDefined();
  },
};
