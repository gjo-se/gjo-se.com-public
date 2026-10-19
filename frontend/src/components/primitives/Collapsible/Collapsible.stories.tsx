import Collapsible from './Collapsible';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'collapsible',
  },
};
