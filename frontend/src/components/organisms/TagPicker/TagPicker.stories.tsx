import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { CoreTagOut } from '@src/lib/api/coreCatalog';

import TagPicker from './TagPicker';

import type { Meta, StoryObj } from '@storybook/react-vite';

// ── Mock Data ───────────────────────────────────────────────────────

const MOCK_TAGS: CoreTagOut[] = [
  { id: 1, slug: 'high-priority', name: 'High Priority', category: 'Risk', color_token: 'red', description: null, sort_order: 0, usage_count: 5, created_at: '', updated_at: '' },
  { id: 2, slug: 'medium-priority', name: 'Medium Priority', category: 'Risk', color_token: 'amber', description: null, sort_order: 0, usage_count: 3, created_at: '', updated_at: '' },
  { id: 3, slug: 'cloud-migration', name: 'Cloud Migration', category: 'Deployment', color_token: 'blue', description: null, sort_order: 0, usage_count: 8, created_at: '', updated_at: '' },
  { id: 4, slug: 'on-premise', name: 'On-Premise', category: 'Deployment', color_token: 'teal', description: null, sort_order: 0, usage_count: 2, created_at: '', updated_at: '' },
  { id: 5, slug: 'budget-gt-100k', name: 'Budget > 100k', category: 'Cost', color_token: 'green', description: null, sort_order: 0, usage_count: 4, created_at: '', updated_at: '' },
  { id: 6, slug: 'budget-lt-50k', name: 'Budget < 50k', category: 'Cost', color_token: 'lime', description: null, sort_order: 0, usage_count: 6, created_at: '', updated_at: '' },
  { id: 7, slug: 'security-review', name: 'Security Review', category: 'Security', color_token: 'violet', description: null, sort_order: 0, usage_count: 7, created_at: '', updated_at: '' },
];

// ── Meta ────────────────────────────────────────────────────────────

const meta = {
  title: 'organisms/TagPicker',
  component: TagPicker,
  tags: ['autodocs'],
  args: {
    selectedTagIds: [],
    onTagsChange: fn(),
    placeholder: 'Tags suchen...',
    disabled: false,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/admin/tagging/tags', ({ request }) => {
          const url = new URL(request.url);
          const q = url.searchParams.get('q') || '';
          const filtered = q ? MOCK_TAGS.filter(
            (t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()),
          ) : MOCK_TAGS;
          return HttpResponse.json(filtered);
        }),
        http.post('/api/v1/admin/tagging/tags', async ({ request }) => {
          const body = await request.json() as { name: string; category: string; color_token: string };
          const newTag: CoreTagOut = {
            id: 99,
            slug: body.name.toLowerCase().replace(/\s+/g, '-'),
            name: body.name,
            category: body.category,
            color_token: body.color_token,
            description: null,
            sort_order: 0,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          MOCK_TAGS.push(newTag);
          return HttpResponse.json(newTag);
        }),
      ],
    },
  },
} satisfies Meta<typeof TagPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ─────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    selectedTagIds: [],
  },
};

export const WithPreselectedTags: Story = {
  args: {
    selectedTagIds: [1, 3, 5],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('High Priority')).toBeDefined();
    await expect(canvas.getByText('Cloud Migration')).toBeDefined();
    await expect(canvas.getByText('Budget > 100k')).toBeDefined();
  },
};

export const OpenPopover: Story = {
  args: {
    selectedTagIds: [],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Click trigger to open popover', async () => {
      const trigger = canvas.getByText('Tags suchen...');
      await userEvent.click(trigger);
    });
  },
};

export const SearchFiltered: Story = {
  args: {
    selectedTagIds: [],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Open popover and search', async () => {
      await userEvent.click(canvas.getByText('Tags suchen...'));
    });
  },
};

export const EmptySearch: Story = {
  args: {
    selectedTagIds: [],
  },
};

export const Disabled: Story = {
  args: {
    selectedTagIds: [],
    disabled: true,
  },
};

export const AllCategories: Story = {
  args: {
    selectedTagIds: [1, 2, 3, 4, 5, 6, 7],
  },
};
