import PortraitFrame from './PortraitFrame';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/PortraitFrame',
  component: PortraitFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof PortraitFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'PortraitFrame',
  },
};
