import Dialog from './Dialog';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Dialog',
  component: Dialog,
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'dialog',
  },
};
