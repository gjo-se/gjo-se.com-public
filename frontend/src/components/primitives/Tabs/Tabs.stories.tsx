import Tabs from './Tabs';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    slot: 'tabs',
  },
};
