import Alert from './Alert';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Alert',
  component: Alert,
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    slot: 'alert',
    role: 'alert',
  },
};
