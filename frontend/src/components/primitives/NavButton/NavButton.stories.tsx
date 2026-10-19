import NavButton from './NavButton';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/NavButton',
  component: NavButton,
  tags: ['autodocs'],
} satisfies Meta<typeof NavButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'menu',
    tone: 'default',
    type: 'button',
    as: 'span',
    color: 'inherit',
  },
};
