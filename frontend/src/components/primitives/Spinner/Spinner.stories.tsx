import Spinner from './Spinner';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Spinner',
  component: Spinner,
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    slot: 'spinner',
    role: 'status',
    label: 'Loading',
    name: 'loader-2',
    fullWidth: false,
  },
};
