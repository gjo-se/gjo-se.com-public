import Image from './Image';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Image',
  component: Image,
  tags: ['autodocs'],
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loading: 'lazy',
    fit: 'cover',
    frame: 'none',
    type: 'image/webp',
  },
};
