import ScrollArea from './ScrollArea';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'scroll-area-viewport',
  },
};
