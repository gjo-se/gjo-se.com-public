import Chart from './Chart';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Chart',
  component: Chart,
  tags: ['autodocs'],
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'chart',
  },
};
