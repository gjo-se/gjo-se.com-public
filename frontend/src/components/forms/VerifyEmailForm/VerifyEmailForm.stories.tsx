import VerifyEmailForm from './VerifyEmailForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/VerifyEmailForm',
  component: VerifyEmailForm,
  tags: ['autodocs'],
} satisfies Meta<typeof VerifyEmailForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    VerifyState: 'loading',
    variant: 'muted',
    weight: 'bold',
    size: 'sm',
    color: 'success',
    type: 'email',
    placeholder: 'Deine E-Mail-Adresse',
    autoComplete: 'email',
    current: true,
    children: 'VerifyEmailForm',
  },
};
