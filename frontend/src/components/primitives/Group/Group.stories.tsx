import Group from './Group';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Group',
  component: Group,
  tags: ['autodocs'],
} satisfies Meta<typeof Group>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    direction: 'row',
    align: 'center',
    justify: 'start',
    wrap: 'wrap',
    fullHeight: false,
    fullWidth: false,
    gap: 2,
  },
};
