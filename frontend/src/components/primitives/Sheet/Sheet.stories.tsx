import Sheet from './Sheet';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Sheet',
  component: Sheet,
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'sheet',
  },
};
