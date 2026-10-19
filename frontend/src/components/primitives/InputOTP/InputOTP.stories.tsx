import InputOTP from './InputOTP';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/InputOTP',
  component: InputOTP,
  tags: ['autodocs'],
} satisfies Meta<typeof InputOTP>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxLength: 0,
    children: 'InputOTP',
    slot: 'input-otp',
  },
};
