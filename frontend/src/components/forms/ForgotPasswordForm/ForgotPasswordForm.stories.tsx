import ForgotPasswordForm from './ForgotPasswordForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/ForgotPasswordForm',
  component: ForgotPasswordForm,
  tags: ['autodocs'],
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    FormState: 'idle',
    variant: 'muted',
    weight: 'medium',
    color: 'secondary',
    size: 'sm',
    as: 'label',
    type: 'email',
    placeholder: 'name@example.com',
    autoComplete: 'email',
    children: 'ForgotPasswordForm',
  },
};
