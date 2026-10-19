import TwoColumnForm from './TwoColumnForm';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'forms/TwoColumnForm',
  component: TwoColumnForm,
  tags: ['autodocs'],
} satisfies Meta<typeof TwoColumnForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    color: 'error',
    children: 'TwoColumnForm',
  },
};
