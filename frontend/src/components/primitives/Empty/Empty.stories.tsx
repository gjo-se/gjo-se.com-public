import Empty from './Empty';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Empty',
  component: Empty,
  tags: ['autodocs'],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'empty',
  },
};
