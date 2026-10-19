import Logo from './Logo';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Logo',
  component: Logo,
  tags: ['autodocs'],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    variant: 'wordmark',
    ariaLabel: 'gjo:Se',
    role: 'img',
  },
};
