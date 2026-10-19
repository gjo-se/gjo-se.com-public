import Menubar from './Menubar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Menubar',
  component: Menubar,
  tags: ['autodocs'],
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'menubar',
  },
};
