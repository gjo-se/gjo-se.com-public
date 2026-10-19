import ChartTooltip from './ChartTooltip';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'charts/ChartTooltip',
  component: ChartTooltip,
  tags: ['autodocs'],
} satisfies Meta<typeof ChartTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    renderValue: 0,
    variant: 'outlined',
    padding: 'sm',
    weight: 'semibold',
    size: 'sm',
  },
};
