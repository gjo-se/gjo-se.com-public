import Item from './Item';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Item',
  component: Item,
  tags: ['autodocs'],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
  },
};
