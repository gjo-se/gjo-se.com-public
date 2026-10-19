import Overlay from './Overlay';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Overlay',
  component: Overlay,
  tags: ['autodocs'],
} satisfies Meta<typeof Overlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'dialog',
    slot: 'overlay',
  },
};
