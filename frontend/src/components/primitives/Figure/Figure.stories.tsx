import Figure from './Figure';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Figure',
  component: Figure,
  tags: ['autodocs'],
} satisfies Meta<typeof Figure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    aspectRatio: '16/9',
    name: 'image-off',
    size: 'xl',
  },
};
