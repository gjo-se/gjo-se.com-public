import WideField from './WideField';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/WideField',
  component: WideField,
  tags: ['autodocs'],
} satisfies Meta<typeof WideField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'sm',
    color: 'muted',
  },
};
