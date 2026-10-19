import Separator from './Separator';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    spacing: 'none',
    slot: 'separator',
  },
};
