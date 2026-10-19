import Icon from './Icon';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Icon',
  component: Icon,
  tags: ['autodocs'],
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: '<name>',
    size: 'sm',
    variant: 'default',
    shrink: false,
    rotate: false,
    filled: false,
  },
};
