import { MemoryRouter } from 'react-router';

import ProjectCard from './ProjectCard';

import type { Meta, StoryObj } from '@storybook/react-vite';

const project = {
  slug: 'portfolio-feature',
  title: 'Portfolio Feature',
  sub_title: 'Public Portfolio Module',
  image: 'portfolio/feature.webp',
  year: '2026',
};

const meta = {
  title: 'features/portfolio/ProjectCard',
  component: ProjectCard,
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
    streamUrl: (key: string) => `/api/v1/public/portfolio/stream/${key}`,
  },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutThumbnail: Story = {
  args: {
    project: { ...project, image: null, sub_title: null },
  },
};
