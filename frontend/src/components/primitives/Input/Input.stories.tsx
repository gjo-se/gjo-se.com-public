import Input from './Input';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'input',
  },
};
