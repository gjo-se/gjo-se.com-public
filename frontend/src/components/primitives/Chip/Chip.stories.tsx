import Chip from './Chip';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Chip',
  component: Chip,
  tags: ['autodocs'],
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'md',
    shape: 'pill',
    type: 'button',
    selected: false,
  },
};
