import EnvBar from './EnvBar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/EnvBar',
  component: EnvBar,
  tags: ['autodocs'],
} satisfies Meta<typeof EnvBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'status',
    as: 'span',
    variant: 'caps',
  },
};
