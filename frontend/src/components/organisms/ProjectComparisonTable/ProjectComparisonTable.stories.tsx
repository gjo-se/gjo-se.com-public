import ProjectComparisonTable from './ProjectComparisonTable';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/ProjectComparisonTable',
  component: ProjectComparisonTable,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectComparisonTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    as: 'span',
    size: 'sm',
    weight: 'medium',
    variant: 'destructive',
    code: 500,
    title: 'Zum kanonischen Projekt machen',
    spacing: 'my-6',
    color: 'muted',
    label: 'Kanonisch',
    name: 'crown',
    loading: false,
    LABEL_W: 130,
    COL_MIN_W: 160,
    COL_MAX_W: 200,
  },
};
