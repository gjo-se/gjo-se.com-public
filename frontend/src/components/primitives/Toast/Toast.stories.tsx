import Toast from './Toast';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Toast',
  component: Toast,
  tags: ['autodocs'],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    theme: 'system',
    name: 'loader-2',
    size: 'sm',
  },
};
