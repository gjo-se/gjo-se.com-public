import Bubble from './Bubble';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Bubble',
  component: Bubble,
  tags: ['autodocs'],
} satisfies Meta<typeof Bubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    slot: 'bubble',
  },
};
