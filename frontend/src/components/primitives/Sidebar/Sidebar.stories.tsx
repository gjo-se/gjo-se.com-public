import Sidebar from './Sidebar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    side: 'left',
    variant: 'sidebar',
    collapsible: 'offcanvas',
    slot: 'sidebar-inner',
    sidebar: 'sidebar',
    mobile: true,
  },
};
