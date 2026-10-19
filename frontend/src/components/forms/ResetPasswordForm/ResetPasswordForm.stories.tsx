import ResetPasswordForm from './ResetPasswordForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/ResetPasswordForm',
  component: ResetPasswordForm,
  tags: ['autodocs'],
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    FormState: 'validating',
    variant: 'muted',
    weight: 'medium',
    size: 'sm',
    color: 'secondary',
    as: 'label',
    type: 'password',
    placeholder: '••••••••',
    autoComplete: 'new-password',
    current: true,
    children: 'ResetPasswordForm',
  },
};
