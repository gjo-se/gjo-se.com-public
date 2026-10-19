import ProjectMergeCell from './ProjectMergeCell';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ProjectMergeCell',
  component: ProjectMergeCell,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectMergeCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'span',
    size: 'sm',
    color: 'muted',
  },
};
