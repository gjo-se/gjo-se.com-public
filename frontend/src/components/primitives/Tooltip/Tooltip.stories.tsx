import Tooltip from './Tooltip';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'tooltip',
  },
};
