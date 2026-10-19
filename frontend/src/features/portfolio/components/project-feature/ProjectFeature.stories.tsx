import { MemoryRouter } from 'react-router';

import ProjectFeature from './ProjectFeature';

import type { Meta, StoryObj } from '@storybook/react-vite';

const project = {
  slug: 'ai',
  title: 'AI',
  sub_title: 'Motor',
  image: 'portfolio/ai.webp',
  year: '2026',
  teaser: null,
  impact_summary: '**40 %** schnellere Projekt-Ladezeiten und ein konsistentes Translation-Table-Pattern über alle Inhalte.',
};

const meta = {
  title: 'features/portfolio/ProjectFeature',
  component: ProjectFeature,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    project,
    num: '01',
    streamUrl: (key: string) => `/api/v1/public/portfolio/stream/${key}`,
  },
} satisfies Meta<typeof ProjectFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Standard – Cover-Bild + mono/kupfer META-Zeile (`01 AI · Motor`) + Impact-Band. */
export const SnapshotCard: Story = {};

/** Ohne Metapher – META-Zeile bleibt bei `01 AI`. */
export const WithoutMetaphor: Story = {
  args: {
    num: '02',
    project: { ...project, sub_title: null, title: 'Architecture' },
  },
};

/** Ohne Bild und Impact-Summary – Muted-Cover-Fläche mit META-Zeile, kein Band. */
export const WithoutImage: Story = {
  args: {
    project: { ...project, image: null, impact_summary: null, sub_title: null },
  },
};
