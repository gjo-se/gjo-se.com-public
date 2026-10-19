import Direction from './Direction';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Direction',
  component: Direction,
  tags: ['autodocs'],
} satisfies Meta<typeof Direction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    direction: 'ltr',
  },
};
