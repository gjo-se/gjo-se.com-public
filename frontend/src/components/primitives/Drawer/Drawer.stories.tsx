import Drawer from './Drawer';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Drawer',
  component: Drawer,
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'drawer',
  },
};
