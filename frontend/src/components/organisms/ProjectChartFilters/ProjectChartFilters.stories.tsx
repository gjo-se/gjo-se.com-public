import ProjectChartFilters from './ProjectChartFilters';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'charts/ProjectChartFilters',
  component: ProjectChartFilters,
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectChartFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'h2',
    size: 'sm',
    children: 'ProjectChartFilters',
  },
};
