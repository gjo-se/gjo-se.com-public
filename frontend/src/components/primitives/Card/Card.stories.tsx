import Card from './Card';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    slot: 'card',
  },
};
