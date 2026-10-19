import Skeleton from './Skeleton';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    slot: 'skeleton',
  },
};
