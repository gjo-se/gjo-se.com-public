import MessageScroller from './MessageScroller';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/MessageScroller',
  component: MessageScroller,
  tags: ['autodocs'],
} satisfies Meta<typeof MessageScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'message-scroller',
  },
};
