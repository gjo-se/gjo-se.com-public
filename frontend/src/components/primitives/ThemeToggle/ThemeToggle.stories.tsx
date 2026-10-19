import ThemeToggle from './ThemeToggle';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isDark: false,
    onToggle: '<onToggle>',
    variant: 'ghost',
    size: 'sm',
    name: 'moon',
  },
};
