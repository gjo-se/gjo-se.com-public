import Grid from './Grid';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Grid',
  component: Grid,
  tags: ['autodocs'],
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cols: 1,
    gap: 4,
  },
};
