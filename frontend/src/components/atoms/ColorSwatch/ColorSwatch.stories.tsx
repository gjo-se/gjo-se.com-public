import ColorSwatch from './ColorSwatch';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'atoms/ColorSwatch',
  component: ColorSwatch,
  tags: ['autodocs'],
} satisfies Meta<typeof ColorSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: '<color>',
    size: 'sm',
    shape: 'square',
    hidden: true,
  },
};
