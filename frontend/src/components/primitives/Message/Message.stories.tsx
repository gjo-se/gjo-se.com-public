import Message from './Message';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Message',
  component: Message,
  tags: ['autodocs'],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    align: 'start',
    slot: 'message',
  },
};
