import Blockquote from './Blockquote';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Blockquote',
  component: Blockquote,
  tags: ['autodocs'],
} satisfies Meta<typeof Blockquote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};
