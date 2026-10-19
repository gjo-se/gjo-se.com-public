import Popover from './Popover';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'popover',
  },
};
