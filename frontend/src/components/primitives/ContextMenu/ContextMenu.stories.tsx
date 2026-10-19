import ContextMenu from './ContextMenu';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/ContextMenu',
  component: ContextMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'context-menu',
  },
};
