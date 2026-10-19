import ProjectDetailView from './ProjectDetailView';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/ProjectDetailView',
  component: ProjectDetailView,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: 500,
    title: 'Ladefehler',
    backUrl: '/admin/aiscope/project',
    spacing: 'my-6',
    variant: 'primary',
    padding: 'md',
    size: 'xs',
    as: 'span',
    weight: 'medium',
    color: 'muted',
    loading: false,
    children: 'ProjectDetailView',
  },
};
