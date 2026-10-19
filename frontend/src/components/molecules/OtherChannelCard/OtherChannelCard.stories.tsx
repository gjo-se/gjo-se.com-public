import OtherChannelCard from './OtherChannelCard';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/OtherChannelCard',
  component: OtherChannelCard,
  tags: ['autodocs'],
} satisfies Meta<typeof OtherChannelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'channel-card',
    as: 'span',
    color: 'secondary',
    size: 'xs',
  },
};
