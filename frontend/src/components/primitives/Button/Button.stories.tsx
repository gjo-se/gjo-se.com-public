import Button from './Button';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    slot: 'button',
    name: 'loader-2',
    loading: false,
    fullWidth: false,
    submit: false,
  },
};
