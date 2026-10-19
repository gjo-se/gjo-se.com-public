import Kbd from './Kbd';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'primitives/Kbd',
  component: Kbd,
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slot: 'kbd',
  },
};
