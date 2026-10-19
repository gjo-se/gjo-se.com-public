import Command from './Command';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Command',
  component: Command,
  tags: ['autodocs'],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'command',
  },
};
