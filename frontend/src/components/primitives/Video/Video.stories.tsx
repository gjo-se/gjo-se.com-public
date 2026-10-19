import Video from './Video';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Video',
  component: Video,
  tags: ['autodocs'],
} satisfies Meta<typeof Video>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    controls: true,
  },
};
