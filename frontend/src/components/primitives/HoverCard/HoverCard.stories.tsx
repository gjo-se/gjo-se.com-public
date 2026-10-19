import HoverCard from './HoverCard';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'hover-card',
  },
};
