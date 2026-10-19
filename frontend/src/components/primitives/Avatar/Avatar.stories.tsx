import Avatar from './Avatar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    alt: '<alt>',
    size: 'md',
    slot: 'avatar',
    fit: 'cover',
    variant: 'caption',
    weight: 'semibold',
    color: 'muted',
  },
};
