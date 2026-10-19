import Progress from './Progress';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Progress',
  component: Progress,
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 0,
    size: 'default',
    max: 100,
  },
};
