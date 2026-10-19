import AuthForm from './AuthForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/AuthForm',
  component: AuthForm,
  tags: ['autodocs'],
} satisfies Meta<typeof AuthForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    AuthFormMode: 'login',
    mode: 'login',
    variant: 'muted',
    weight: 'medium',
    size: 'sm',
    color: 'secondary',
    as: 'label',
    placeholder: '••••••••',
    autoComplete: 'new-password',
    type: 'password',
    children: 'AuthForm',
  },
};
