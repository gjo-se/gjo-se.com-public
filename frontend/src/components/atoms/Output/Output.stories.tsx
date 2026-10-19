import Output from './Output';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'atoms/Output',
  component: Output,
  tags: ['autodocs'],
} satisfies Meta<typeof Output>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Output',
  },
};
