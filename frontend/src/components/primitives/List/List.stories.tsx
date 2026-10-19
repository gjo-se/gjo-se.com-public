import List from './List';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/List',
  component: List,
  tags: ['autodocs'],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    As: 'ul',
    listStyle: 'default',
    spacing: 'default',
  },
};
