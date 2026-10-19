import AspectRatio from './AspectRatio';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ratio: 0,
    slot: 'aspect-ratio',
  },
};
