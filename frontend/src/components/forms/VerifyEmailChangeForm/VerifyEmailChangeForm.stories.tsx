import VerifyEmailChangeForm from './VerifyEmailChangeForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/VerifyEmailChangeForm',
  component: VerifyEmailChangeForm,
  tags: ['autodocs'],
} satisfies Meta<typeof VerifyEmailChangeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    VerifyState: 'loading',
    variant: 'muted',
    weight: 'bold',
    size: 'sm',
    current: true,
    children: 'VerifyEmailChangeForm',
  },
};
